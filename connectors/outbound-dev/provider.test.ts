import { assert, assertEquals, assertMatch, assertRejects } from "@std/assert";
import type { RunInput } from "@shared/core";
import { testBundle, testSealedUnit } from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

/**
 * Provider-wide facts, once (the per-endpoint suites cover each doc's own
 * behaviour): the identity set, the hooks every doc shares, and what goes
 * on the wire, which replay cannot show because it never records request
 * headers and never compares request bodies.
 */

const OUTBOUND_IDS = [
    "outbound-dev#companies/autocomplete",
    "outbound-dev#companies/count",
    "outbound-dev#companies/filters",
    "outbound-dev#companies/people",
    "outbound-dev#companies/resolve",
    "outbound-dev#companies/search",
    "outbound-dev#emails/verify",
    "outbound-dev#people/autocomplete",
    "outbound-dev#people/count",
    "outbound-dev#people/enrich/batch",
    "outbound-dev#people/enrich/email",
    "outbound-dev#people/enrich/phone",
    "outbound-dev#people/filters",
    "outbound-dev#people/search",
];
const BASE = "https://api.outbound.dev/v1";
const KEY = "ob_live_TESTKEY0123456789";
const ANA = { linkedinUrl: "https://www.linkedin.com/in/ana-ruiz-ops" };
const JOB_ID = "6a1f0c2b9d4e8a7f3c5b2e14";

type Sent = { method: string; url: string; headers: Headers; body: unknown };

/** One answer of the fake fetch: a response, or a call that fails in
 *  transit (`"lost"`), as a dropped connection does. */
type Answer = { status: number; body: unknown } | "lost";

/** An engine whose fetch answers `responses` in order and records every
 *  request it was asked to send. */
const fake = (responses: Answer[]) => {
    const seen: Sent[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: KEY }),
            fetch: (target, init) => {
                seen.push({
                    method: init?.method ?? "GET",
                    url: target instanceof Request
                        ? target.url
                        : String(target),
                    headers: new Headers(init?.headers),
                    body: init?.body
                        ? JSON.parse(String(init.body))
                        : undefined,
                });
                const next = responses[seen.length - 1];
                if (next === "lost") {
                    return Promise.reject(new TypeError("connection lost"));
                }
                return Promise.resolve(
                    new Response(JSON.stringify(next.body), {
                        status: next.status,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
        sleep: () => Promise.resolve(),
    });
    return { engine, seen };
};

/** Run one endpoint to its end and return every request the engine sent. */
const wire = async (
    id: string,
    input: RunInput,
    responses: Answer[],
) => {
    const { engine, seen } = fake(responses);
    const loaded = await engine.load(await testSealedUnit(id));
    await loaded.run(input);
    return seen;
};

const enriched = { emails: [], phones: [], found: {} };
const job = (status: string, extra: Record<string, unknown> = {}) => ({
    id: JOB_ID,
    type: "people_enrichment",
    status,
    find: "email",
    providers: "package",
    units: [],
    createdAt: "2026-11-28T10:00:00.000Z",
    ...extra,
});

Deno.test("outbound-dev docs: fourteen ids, one inject and one error digest", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("outbound-dev#"))
        .sort();
    assertEquals(ids, OUTBOUND_IDS);
    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            doc.output.fromError?.$fn.key,
            first.output.fromError?.$fn.key,
            id,
        );
    }
});

Deno.test("outbound-dev: the two counts share one start and one poll", async () => {
    const bundle = await testBundle();
    const people = bundle.endpoints["outbound-dev#people/count"];
    const companies = bundle.endpoints["outbound-dev#companies/count"];
    assert(people.lifecycle?.start !== undefined);
    assertEquals(
        people.lifecycle?.start?.$fn.key,
        companies.lifecycle?.start?.$fn.key,
    );
    assertEquals(
        people.lifecycle?.poll?.$fn.key,
        companies.lifecycle?.poll?.$fn.key,
    );
});

Deno.test("outbound-dev: the key travels as `Authorization: Bearer`", async () => {
    const [request] = await wire(
        "outbound-dev#companies/resolve",
        { body: { domain: "halden-freight.example" } },
        [{ status: 200, body: { status: "not_found", company: null } }],
    );
    assertEquals(request.url, `${BASE}/companies/resolve`);
    assertEquals(request.headers.get("authorization"), `Bearer ${KEY}`);
});

Deno.test("outbound-dev: both lookups post to /people/enrich, and only the phone one states `find`", async () => {
    const [email] = await wire(
        "outbound-dev#people/enrich/email",
        { body: ANA },
        [{ status: 200, body: enriched }],
    );
    assertEquals(email.method, "POST");
    assertEquals(email.url, `${BASE}/people/enrich`);
    // The route's own default is an email: nothing is added.
    assertEquals(email.body, ANA);

    const [phone] = await wire(
        "outbound-dev#people/enrich/phone",
        { body: { ...ANA, providers: "waterfall" } },
        [{ status: 200, body: enriched }],
    );
    assertEquals(phone.url, `${BASE}/people/enrich`);
    assertEquals(phone.body, {
        ...ANA,
        providers: "waterfall",
        find: "phone",
    });
});

Deno.test("outbound-dev#people/enrich/batch: the submit carries a run-stable idempotency key, the read follows the job id", async () => {
    const [submit, read] = await wire(
        "outbound-dev#people/enrich/batch",
        { body: { people: [ANA] } },
        [
            { status: 202, body: job("running") },
            {
                status: 200,
                body: job("succeeded", { chargedUsd: "0.000000", results: [] }),
            },
        ],
    );
    assertEquals(submit.method, "POST");
    assertEquals(submit.url, `${BASE}/people/enrich/batch`);
    assertMatch(submit.headers.get("idempotency-key") ?? "", /^.+:submit$/);
    assertEquals(read.method, "GET");
    assertEquals(read.url, `${BASE}/jobs/${JOB_ID}`);
    assertEquals(read.headers.get("authorization"), `Bearer ${KEY}`);
});

Deno.test("outbound-dev#people/enrich/batch: a stopped run cancels the job, again if refused, and settles what it had found", async () => {
    const { engine, seen } = fake([
        { status: 202, body: job("running") },
        // stop: a cancel the job refuses while it is still starting, a read,
        // the cancel again (taken), a read while it winds down, then the end
        {
            status: 409,
            body: { error: { code: "job_starting", message: "Try again." } },
        },
        { status: 200, body: job("running") },
        { status: 202, body: job("running") },
        { status: 200, body: job("running") },
        {
            status: 200,
            body: job("cancelled", {
                units: [{ item: "email_found_package", units: 3 }],
                chargedUsd: "0.060000",
            }),
        },
    ]);
    const loaded = await engine.load(
        await testSealedUnit("outbound-dev#people/enrich/batch"),
    );
    const input = { body: { people: Array(5).fill(ANA) } };
    const started = await loaded.start(input);
    assertEquals(started.kind, "RUNNING");
    assert(started.kind === "RUNNING");
    const stopped = await loaded.stop(input, started.state);
    assertEquals(
        seen.map((request) => `${request.method} ${request.url}`),
        [
            `POST ${BASE}/people/enrich/batch`,
            `POST ${BASE}/jobs/${JOB_ID}/cancel`,
            `GET ${BASE}/jobs/${JOB_ID}`,
            // sent again, because the first was refused; never a third time
            `POST ${BASE}/jobs/${JOB_ID}/cancel`,
            `GET ${BASE}/jobs/${JOB_ID}`,
            `GET ${BASE}/jobs/${JOB_ID}`,
        ],
    );
    assertEquals(stopped.kind, "COMPLETED");
    assert(stopped.kind === "COMPLETED");
    assertEquals(stopped.usage.credits, { default: 0.06 });
    assertEquals(
        (stopped.output as Record<string, unknown>).status,
        "cancelled",
    );
});

Deno.test("outbound-dev#people/count: a query count is repeated with the filters outbound.dev returned, never the query", async () => {
    const counted = {
        job_title_levels: ["director", "vp"],
        job_title_role: ["operations"],
    };
    const [first, repeat] = await wire(
        "outbound-dev#people/count",
        { body: { query: "operations directors and VPs" } },
        [
            { status: 202, body: { status: "pending", filters: counted } },
            {
                status: 200,
                body: { status: "ready", total: 42, filters: counted },
            },
        ],
    );
    assertEquals(first.body, { query: "operations directors and VPs" });
    assertEquals(repeat.method, "POST");
    assertEquals(repeat.url, first.url);
    assertEquals(repeat.body, { filters: counted });
});

Deno.test("outbound-dev#people/enrich/batch: a start that meets its own earlier attempt still in flight fails, never ends the run", async () => {
    const { engine } = fake([{
        status: 409,
        body: {
            error: {
                code: "idempotency_in_progress",
                message: "A call with this key is still running.",
            },
        },
    }]);
    const loaded = await engine.load(
        await testSealedUnit("outbound-dev#people/enrich/batch"),
    );
    // Settling here would end the run beside a job the first attempt may
    // still start: the attempt throws, so a retry meets that answer.
    await assertRejects(
        () => loaded.run({ body: { people: [ANA] } }),
        Error,
        "earlier start",
    );
});

Deno.test("outbound-dev: the paid single calls carry a run-stable idempotency key, through one shared start", async () => {
    const bundle = await testBundle();
    const paid = [
        "outbound-dev#people/enrich/email",
        "outbound-dev#people/enrich/phone",
        "outbound-dev#emails/verify",
    ];
    const starts = paid.map((id) =>
        bundle.endpoints[id].lifecycle?.start?.$fn.key
    );
    assert(starts[0] !== undefined);
    assertEquals(starts, [starts[0], starts[0], starts[0]]);

    const [email] = await wire(paid[0], { body: ANA }, [
        { status: 200, body: enriched },
    ]);
    assertMatch(email.headers.get("idempotency-key") ?? "", /^.+:call$/);
    const [verify] = await wire(
        paid[2],
        { body: { email: "ana.ruiz@halden-freight.example" } },
        [{
            status: 200,
            body: { email: "ana.ruiz@halden-freight.example", status: "valid" },
        }],
    );
    assertMatch(verify.headers.get("idempotency-key") ?? "", /^.+:call$/);
});

Deno.test("outbound-dev#companies/count: a filters count repeats its own request and keeps no state", async () => {
    const filters = { headquartersCountryCode: ["PRT"] };
    const [first, repeat] = await wire(
        "outbound-dev#companies/count",
        { body: { filters } },
        [
            { status: 202, body: { status: "pending", filters } },
            { status: 200, body: { status: "ready", total: 812, filters } },
        ],
    );
    assertEquals(first.body, { filters });
    assertEquals(repeat.method, "POST");
    assertEquals(repeat.url, first.url);
    assertEquals(repeat.body, { filters });
});

const IN_PROGRESS = {
    status: 409,
    body: {
        error: {
            code: "idempotency_in_progress",
            message: "A call with this key is still running.",
        },
    },
};

Deno.test("outbound-dev: a paid single call that meets its own earlier attempt still in flight fails, never settles at zero", async () => {
    for (
        const [id, body] of [
            ["outbound-dev#people/enrich/email", ANA],
            ["outbound-dev#people/enrich/phone", ANA],
            ["outbound-dev#emails/verify", {
                email: "ana.ruiz@halden-freight.example",
            }],
        ] as const
    ) {
        const { engine } = fake([IN_PROGRESS]);
        const loaded = await engine.load(await testSealedUnit(id));
        await assertRejects(
            () => loaded.run({ body }),
            Error,
            "earlier call",
            id,
        );
    }
    // Any other 409 is an answer: another call is enriching this person.
    const { engine } = fake([{
        status: 409,
        body: {
            error: { code: "enrichment_in_progress", message: "Try again." },
        },
    }]);
    const loaded = await engine.load(
        await testSealedUnit("outbound-dev#people/enrich/email"),
    );
    const result = await loaded.run({ body: ANA });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("outbound-dev#people/enrich/batch: a submit that fails on outbound.dev's side fails the attempt, a refusal ends the run", async () => {
    for (const status of [500, 503, 408]) {
        const { engine } = fake([{ status, body: {} }]);
        const loaded = await engine.load(
            await testSealedUnit("outbound-dev#people/enrich/batch"),
        );
        // The job may have started: a retry under the same key is answered
        // with it, so the attempt must not settle at zero.
        await assertRejects(
            () => loaded.run({ body: { people: [ANA] } }),
            Error,
            "may have started",
            String(status),
        );
    }
    const { engine } = fake([{ status: 429, body: {} }]);
    const loaded = await engine.load(
        await testSealedUnit("outbound-dev#people/enrich/batch"),
    );
    const refused = await loaded.run({ body: { people: [ANA] } });
    assertEquals(refused.httpStatus, 429);
    assertEquals(refused.isProviderError, true);
});

Deno.test("outbound-dev#people/enrich/batch: a stop call lost in transit keeps the watch going, and a job never read ends UNRESOLVED", async () => {
    const input = { body: { people: [ANA] } };
    const ended = job("cancelled", {
        units: [{ item: "email_found_package", units: 1 }],
        chargedUsd: "0.020000",
    });
    // The cancel is lost, then taken; the first read is lost, the next ends.
    const drained = fake([
        { status: 202, body: job("running") },
        "lost",
        { status: 202, body: job("running") },
        "lost",
        { status: 200, body: ended },
    ]);
    const first = await drained.engine.load(
        await testSealedUnit("outbound-dev#people/enrich/batch"),
    );
    const started = await first.start(input);
    assert(started.kind === "RUNNING");
    const stopped = await first.stop(input, started.state);
    assert(stopped.kind === "COMPLETED");
    assertEquals(stopped.usage.credits, { default: 0.02 });

    // Every call after the start is lost: nothing was read, so nothing can
    // be called settled. A throw would have read as nothing owed.
    const unread = fake([
        { status: 202, body: job("running") },
        ...Array<Answer>(16).fill("lost"),
    ]);
    const second = await unread.engine.load(
        await testSealedUnit("outbound-dev#people/enrich/batch"),
    );
    const begun = await second.start(input);
    assert(begun.kind === "RUNNING");
    const unresolved = await second.stop(input, begun.state);
    assertEquals(unresolved.kind, "UNRESOLVED");
});
