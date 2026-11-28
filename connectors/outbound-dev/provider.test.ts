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

/** An engine whose fetch answers `responses` in order and records every
 *  request it was asked to send. */
const fake = (responses: { status: number; body: unknown }[]) => {
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
    responses: { status: number; body: unknown }[],
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
