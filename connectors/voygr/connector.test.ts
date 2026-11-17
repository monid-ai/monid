import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    type Json,
    type OwnedResource,
    type RunInput,
    RunKind,
    type RunResult,
    type RunStopResult,
} from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    type Fixture,
    fixtureReader,
    loadEndpoint,
    loadFixture,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { TERMS_TEXT } from "./endpoints/place-call/schema/inputs.ts";
import provider from "./provider.ts";
import { harness } from "./test-support.ts";

/**
 * THE voygr provider suite: the shared sub-account `ensure` and the
 * fail-closed sync relay, driven through `voygr#list-skills`; then what
 * every endpoint owes the provider, checked on all 15 (sub-account header,
 * fail closed, output projection, shared fns, cross-references). Chains
 * are SYNTHETIC; every id is made up.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const OPS = await loadFixture(`${HERE}fixtures/synthetic-sub-account-ops.json`);

const ID = "voygr#list-skills";
const SUB_ID = "sub_00000000000000000000000000000001";

const OWNED: OwnedResource = {
    resource: "voygr/sub-account",
    externalId: SUB_ID,
    data: { reference: "monid:ws-1" },
};

/** A one-call chain: the fixture's call with this method and status. */
function chain(method: string, status: number): Fixture {
    const call = OPS.calls.find((c) =>
        c.req.method === method && c.res.status === status
    );
    assert(call !== undefined, `no ${method} ${status} call in the fixture`);
    return { ...OPS, calls: [call] };
}

/** `voygr#list-skills`, replaying `fixture` (none = zero upstream calls). */
async function load(
    opts: { fixture?: Fixture; resources?: OwnedResource[] } = {},
) {
    return await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay",
        scopeKey: "ws-1",
        ...opts,
    });
}

interface Sent {
    url: string;
    method: string;
    headers: Headers;
    body: unknown;
}

/** The engine over a stub that answers `status`/`body` and records what
 *  went on the wire (replay never records headers or bodies). */
async function wire(
    status: number,
    body: Json,
    resources: OwnedResource[] = [],
) {
    const sent: Sent[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                sent.push({
                    url: String(url),
                    method: init?.method ?? "GET",
                    headers: new Headers(init?.headers),
                    body: typeof init?.body === "string"
                        ? JSON.parse(init.body)
                        : undefined,
                });
                return Promise.resolve(Response.json(body, { status }));
            },
        }),
        resources: fixtureReader(resources),
        scopeKey: "ws-1",
    });
    return { loaded: await engine.load(await testSealedUnit(ID)), sent };
}

// ---------------------------------------------------------------------------
// ensure: one VOYGR sub-account per Monid workspace
// ---------------------------------------------------------------------------

Deno.test("ensure_creates_on_first_use", async () => {
    const loaded = await load({ fixture: chain("POST", 201) });
    assertEquals(await loaded.ensure({}), [{
        resource: "voygr/sub-account",
        externalId: SUB_ID,
        data: { reference: "monid:ws-1" },
    }]);
});

Deno.test("ensure_reuses_owned_without_post", async () => {
    // no fixture: a POST would fail the test
    const loaded = await load({ resources: [OWNED] });
    assertEquals(await loaded.ensure({}), []);
});

Deno.test("ensure_second_post_returns_existing", async () => {
    // the API answers 200 (not 201) for a reference it already knows,
    // whatever the sub-account's status: the same id seeds again
    const loaded = await load({ fixture: chain("POST", 200) });
    const seeds = await loaded.ensure({});
    assertEquals(seeds.length, 1);
    assertEquals(seeds[0].externalId, SUB_ID);
    assertEquals(seeds[0].data, { reference: "monid:ws-1" });
});

Deno.test("ensure_non_2xx_throws", async () => {
    const loaded = await load({ fixture: chain("POST", 403) });
    const error = await assertRejects(() => loaded.ensure({}));
    assert(
        String(error).includes("voygr sub-account ensure failed with HTTP 403"),
        String(error),
    );
});

Deno.test("ensure_server_error_throws", async () => {
    const { loaded } = await wire(500, { detail: "boom" });
    const error = await assertRejects(() => loaded.ensure({}));
    assert(
        String(error).includes("voygr sub-account ensure failed with HTTP 500"),
        String(error),
    );
});

Deno.test("ensure_2xx_without_id_throws", async () => {
    // a 2xx that names no sub-account must never seed a nameless row
    for (const body of [{}, { id: "" }, { id: 7 }, []]) {
        const { loaded } = await wire(201, body as Json);
        await assertRejects(() => loaded.ensure({}));
    }
});

Deno.test("ensure_posts_reference_with_api_key_and_no_sub_account", async () => {
    const { loaded, sent } = await wire(201, { id: SUB_ID });
    await loaded.ensure({});
    assertEquals(sent.length, 1);
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].url, "https://api.voygr.tech/v1/sub-accounts");
    assertEquals(sent[0].body, { reference: "monid:ws-1" });
    assertEquals(sent[0].headers.get("x-api-key"), "test-key");
    assertEquals(sent[0].headers.get("content-type"), "application/json");
    // creating the sub-account is a partner call, not a sub-account call
    assertEquals(sent[0].headers.get("x-sub-account"), null);
});

// ---------------------------------------------------------------------------
// relay: every request carries X-Sub-Account, or fails closed
// ---------------------------------------------------------------------------

Deno.test("relay_fails_closed_without_owned_sub_account", async () => {
    // no fixture: nothing may reach the upstream without a sub-account
    const loaded = await load();
    const result = await loaded.start({});
    assertEquals(result.kind, RunKind.COMPLETED);
    assert(result.kind === RunKind.COMPLETED);
    assertEquals(result.httpStatus, 503);
    assertEquals(
        (result.output as { code: string }).code,
        "SUB_ACCOUNT_UNAVAILABLE",
    );
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("relay_fails_closed_sends_nothing_upstream", async () => {
    const { loaded, sent } = await wire(200, []);
    const result = await loaded.start({});
    assert(result.kind === RunKind.COMPLETED);
    assertEquals(result.httpStatus, 503);
    assertEquals(sent, []);
});

Deno.test("relay_sends_owned_sub_account_and_returns_the_response", async () => {
    const skills = [{ skill_id: "concierge", title: "Concierge" }];
    const { loaded, sent } = await wire(200, skills, [OWNED]);
    const result = await loaded.start({});
    assert(result.kind === RunKind.COMPLETED);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, skills);
    assertEquals(sent.length, 1);
    assertEquals(sent[0].method, "GET");
    assertEquals(sent[0].url, "https://api.voygr.tech/skills");
    assertEquals(sent[0].headers.get("x-sub-account"), SUB_ID);
    assertEquals(sent[0].headers.get("x-api-key"), "test-key");
});

Deno.test("relay_passes_an_upstream_refusal_through", async () => {
    const refusal = { detail: { error_code: "SUB_ACCOUNT_SUSPENDED" } };
    const { loaded } = await wire(403, refusal, [OWNED]);
    const result = await loaded.start({});
    assert(result.kind === RunKind.COMPLETED);
    assertEquals(result.httpStatus, 403);
    assertEquals(result.output, refusal);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("relay_uses_the_workspace_row_the_ensure_seeded", async () => {
    // the hosted flow: ensure seeds, the host persists, start reads it
    const { loaded: first } = await wire(201, { id: SUB_ID });
    const [seed] = await first.ensure({});
    const { loaded, sent } = await wire(200, [], [{
        resource: seed.resource,
        externalId: seed.externalId,
        data: seed.data,
    }]);
    await loaded.start({});
    assertEquals(sent[0].headers.get("x-sub-account"), SUB_ID);
});

// ---------------------------------------------------------------------------
// output projection: customer_id and recording_url never reach a user
// ---------------------------------------------------------------------------

Deno.test("projection_strips_customer_id_and_recording_url_everywhere", async () => {
    const raw = [{
        call_id: "c_1",
        customer_id: "cus_synthetic-0001",
        recording_url: "/calls/c_1/recording",
        has_recording: true,
        nested: { customer_id: "cus_synthetic-0001", keep: 1 },
    }];
    const { loaded } = await wire(200, raw, [OWNED]);
    const result = await loaded.run({});
    assertEquals(result.output, [{
        call_id: "c_1",
        has_recording: true,
        nested: { keep: 1 },
    }]);
});

Deno.test("projection_strips_error_bodies_too", async () => {
    const { loaded } = await wire(403, {
        detail: {
            error_code: "SUB_ACCOUNT_SUSPENDED",
            customer_id: "cus_synthetic-0001",
        },
    }, [OWNED]);
    const result = await loaded.run({});
    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals(result.output, {
        detail: { error_code: "SUB_ACCOUNT_SUSPENDED" },
    });
});

Deno.test("projection_leaves_other_bodies_alone", async () => {
    for (const body of [[], {}, [{ skill_id: "concierge" }], "plain text"]) {
        const { loaded } = await wire(200, body as Json, [OWNED]);
        const result = await loaded.run({});
        assertEquals(result.output, body);
    }
});

// ---------------------------------------------------------------------------
// the provider def
// ---------------------------------------------------------------------------

Deno.test("provider: named voygr, on the VOYGR origin", () => {
    assertEquals(provider.name, "voygr");
    assertEquals(provider.request?.baseUrl, "https://api.voygr.tech");
});

Deno.test("list-skills declares the sub-account binding", async () => {
    const { doc } = await testSealedUnit(ID);
    assertEquals(doc.resources?.uses?.map((b) => b.id), ["voygr/sub-account"]);
});

// ---------------------------------------------------------------------------
// provider-wide: the same duties on all 15 endpoints
// ---------------------------------------------------------------------------

const CALL = "c_synthetic01";
const BATCH = "batch_synthetic01";
const PLACE = {
    poi_name: "Blue Bottle Coffee",
    address: "66 Mint St, San Francisco, CA 94103",
};

/** One schema-valid input per endpoint. The first test below pins this
 *  list to the compiled bundle, so a new endpoint cannot skip the checks. */
const INPUTS: Record<string, RunInput> = {
    "voygr#enrich": { body: { ...PLACE, attributes: ["phone"] } },
    "voygr#suggest-places": {
        body: { query: "a quiet Italian place in Wicker Park" },
    },
    "voygr#validate-batch": { body: { pois: [PLACE] } },
    "voygr#enrich-batch": { body: { places: [PLACE], attributes: ["phone"] } },
    "voygr#get-job": { pathParams: { batch_id: BATCH } },
    "voygr#cancel-job": { pathParams: { batch_id: BATCH } },
    "voygr#place-call": {
        body: {
            accept_terms: TERMS_TEXT,
            target_phone: "+14155550101",
            brief: "Ask when the kitchen closes tonight.",
        },
    },
    "voygr#list-calls": { queryParams: { limit: 5 } },
    "voygr#get-call": { pathParams: { call_id: CALL } },
    "voygr#call-events": { pathParams: { call_id: CALL } },
    "voygr#answer-call": {
        pathParams: { call_id: CALL },
        body: { answer: "Yes, 7pm works." },
    },
    "voygr#cancel-call": { pathParams: { call_id: CALL } },
    "voygr#list-skills": {},
    "voygr#skill-manifest": { pathParams: { skill_id: "concierge" } },
    "voygr#me": {},
};
const IDS = Object.keys(INPUTS).sort();

/** The async runs, and every endpoint with a start of its own; the rest
 *  run on the provider relay. */
const ASYNC = [
    "voygr#enrich-batch",
    "voygr#place-call",
    "voygr#validate-batch",
];
const OWN_START = [...ASYNC, "voygr#call-events"];

/** The two keys no output may carry, at the top and nested. */
const LEAK = {
    customer_id: "cus_synthetic-0001",
    recording_url: `/calls/${CALL}/recording`,
};

/** A VOYGR stand-in that lets every endpoint run to its end: a call or a
 *  job is created, reads back finished and can be cancelled. Every JSON
 *  body carries `LEAK`. The events are SSE text, passed on as VOYGR sends
 *  them; like VOYGR's, they carry neither key. */
function upstream(url: string, method: string): Response {
    const path = new URL(url).pathname;
    if (path.endsWith("/events")) {
        return new Response(
            'id: 1\nevent: status_change\ndata: {"status": "completed"}\n\n',
            { headers: { "content-type": "text/event-stream" } },
        );
    }
    if (method === "POST" && path === "/calls") {
        return Response.json(
            { call_id: CALL, status: "dialing", ...LEAK },
            { status: 201 },
        );
    }
    if (path.startsWith("/calls/")) {
        return Response.json({
            call_id: CALL,
            status: "completed",
            outcome_type: "success_no_booking",
            outcome_charge_cents: 10,
            cancelled: true,
            ...LEAK,
            nested: { ...LEAK },
        });
    }
    if (method === "POST" && path.startsWith("/v1/jobs/")) {
        return Response.json(
            { batch_id: BATCH, status: "queued", ...LEAK },
            { status: 202 },
        );
    }
    if (path.startsWith("/v1/jobs/")) {
        return Response.json({
            batch_id: BATCH,
            status: "completed",
            progress: { processed: 1, succeeded: 1, failed: 0 },
            ...LEAK,
        });
    }
    return Response.json([{ ok: true, ...LEAK, nested: { ...LEAK } }]);
}

/** Every request answers 403, the body carrying `LEAK`. */
const refusing = () =>
    Response.json(
        { detail: { error_code: "SUB_ACCOUNT_SUSPENDED", ...LEAK } },
        { status: 403 },
    );

const RUN = { runId: "run-1" };

/** Run `id` over `answer`: start, then for a run that keeps going one poll
 *  and a stop. Returns what went on the wire and every output. */
async function drive(
    id: string,
    answer: (url: string, method: string) => Response,
    resources: OwnedResource[] = [OWNED],
) {
    const { loaded, sent } = await harness(id, import.meta.url)
        .wireWith(answer, resources);
    const input = INPUTS[id];
    const outputs: Json[] = [];
    const started = await loaded.start(input, RUN);
    if (started.kind === RunKind.COMPLETED) {
        outputs.push(started.output);
        return { sent, outputs };
    }
    const polled = await loaded.poll(input, started.state, RUN);
    if (polled.kind === RunKind.COMPLETED) outputs.push(polled.output);
    const stopped = await loaded.stop(input, started.state, RUN);
    if (stopped.kind === RunKind.COMPLETED) outputs.push(stopped.output);
    return { sent, outputs };
}

Deno.test("provider-wide: the checks cover every voygr endpoint", async () => {
    const bundle = await testBundle();
    const compiled = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("voygr#")).sort();
    assertEquals(IDS, compiled);
    assertEquals(IDS.length, 15);
});

Deno.test("every endpoint sends X-Sub-Account on every upstream request", async () => {
    for (const id of IDS) {
        const { sent } = await drive(id, upstream);
        assert(sent.length > 0, `${id} sent nothing`);
        // an async run went through start, poll and stop
        if (ASYNC.includes(id)) {
            assert(sent.length >= 3, `${id}: ${sent.length} requests`);
        }
        for (const s of sent) {
            const at = `${id} ${s.method} ${s.url}`;
            assertEquals(s.headers.get("x-sub-account"), SUB_ID, at);
            assertEquals(s.headers.get("x-api-key"), "test-key", at);
        }
    }
});

Deno.test("every endpoint fails closed without an owned sub-account", async () => {
    for (const id of IDS) {
        const input = INPUTS[id];
        const { loaded, sent } = await harness(id, import.meta.url)
            .wireWith(upstream, []);
        const results: (RunResult | RunStopResult)[] = [
            await loaded.start(input, RUN),
        ];
        if (ASYNC.includes(id)) {
            // a run that lost its row mid-way: poll and stop refuse too
            const owner = await harness(id, import.meta.url).wireWith(upstream);
            const started = await owner.loaded.start(input, RUN);
            assert(started.kind === RunKind.RUNNING, id);
            results.push(
                await loaded.poll(input, started.state, RUN),
                await loaded.stop(input, started.state, RUN),
            );
        }
        for (const result of results) {
            assert(result.kind === RunKind.COMPLETED, id);
            assertEquals(result.httpStatus, 503, id);
            assertEquals(
                (result.output as { code: string }).code,
                "SUB_ACCOUNT_UNAVAILABLE",
                id,
            );
            assertEquals(result.usage, { credits: {}, evidence: {} }, id);
        }
        assertEquals(sent, [], id);
    }
});

Deno.test("no output carries customer_id or recording_url", async () => {
    for (const id of IDS) {
        for (const answer of [upstream, refusing]) {
            const { outputs } = await drive(id, answer);
            assert(outputs.length > 0, id);
            const text = JSON.stringify(outputs);
            assert(!text.includes("customer_id"), `${id}: ${text}`);
            assert(!text.includes("recording_url"), `${id}: ${text}`);
        }
    }
});

Deno.test("identical shared fns intern to one fnTable entry", async () => {
    const bundle = await testBundle();
    const docs = IDS.map((id) => bundle.endpoints[id]);
    const keys = (pick: (doc: (typeof docs)[number]) => string | undefined) =>
        new Set(docs.map(pick));

    // one ensure, bound by all 15
    for (const doc of docs) {
        assertEquals(doc.resources?.uses?.map((b) => b.id), [
            "voygr/sub-account",
        ], doc.id);
    }
    const ensure = keys((doc) => doc.resources?.uses?.[0].ensure?.$fn.key);
    assertEquals(ensure.size, 1);
    assert([...ensure][0]?.startsWith("sha256:"));

    // one projection, in the error slot of all 15 and the success slot of
    // all but voygr#me, which keeps an allowlist instead
    const projection = keys((doc) => doc.output?.fromError?.$fn.key);
    assertEquals(projection.size, 1);
    assert([...projection][0]?.startsWith("sha256:"));
    const success = docs.filter((doc) => doc.id !== "voygr#me");
    assertEquals(
        new Set(success.map((doc) => doc.output?.fromResponse?.$fn.key)),
        projection,
    );
    const me = bundle.endpoints["voygr#me"].output?.fromResponse?.$fn.key;
    assert(me !== undefined && !projection.has(me));

    // one relay start for the 11 endpoints without a lifecycle of their own
    const relayDocs = docs.filter((doc) => !OWN_START.includes(doc.id));
    assertEquals(relayDocs.length, 11);
    const relay = new Set(
        relayDocs.map((doc) => doc.lifecycle?.start?.$fn.key),
    );
    assertEquals(relay.size, 1);
    assert([...relay][0]?.startsWith("sha256:"));
    for (const id of OWN_START) {
        const own = bundle.endpoints[id].lifecycle?.start?.$fn.key;
        assert(own !== undefined && !relay.has(own), id);
    }
});

Deno.test("every voygr# reference in the public text names a voygr endpoint", async () => {
    const bundle = await testBundle();
    const endpoints = IDS.map((id) => bundle.endpoints[id]);
    const resource = bundle.resources?.["voygr/sub-account"];
    assert(resource !== undefined, "voygr/sub-account is not compiled");
    const docs = [bundle.providers.voygr, resource, ...endpoints];
    // meta (summary, description, notes) and every field description
    const texts = [
        ...docs.map((doc) => JSON.stringify(doc.meta)),
        ...endpoints.map((doc) => JSON.stringify(doc.input)),
    ];
    // and the fns: their messages point callers at other endpoints
    const fnKeys = JSON.stringify(docs).matchAll(/"key":"(sha256:[0-9a-f]+)"/g);
    for (const key of new Set([...fnKeys].map((m) => m[1]))) {
        texts.push(bundle.fnTable[key].src);
    }
    const refs = [...texts.join("\n").matchAll(/voygr#[a-z0-9._~\/{}-]*/g)]
        .map((m) => m[0].replace(/\.+$/, ""));
    assert(refs.length > 30, `only ${refs.length} references found`);
    assertEquals(refs.filter((ref) => !IDS.includes(ref)), []);
});
