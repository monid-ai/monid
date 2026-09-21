import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "orbit#v3/search";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("orbit#v3/search: a row seen `enriching` is not a charged build — the receipt settles 2", async () => {
    const result = await run("synthetic-search-async.json", {
        query: "machine learning engineers",
        limit: 12,
    });

    // Live drill, 2026-09-20: twelve index hits, one row `enriching` on the
    // submit and `ready` on the terminal snapshot, receipt 2. Reading that
    // row as a billed build settled 2 + 5.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { CREDIT: 2 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    assertEquals((output.results as unknown[]).length, 12);
    assertEquals("billing" in output, false);
});

Deno.test("orbit#v3/search: a build never seen mid-build is still charged — the receipt settles 11", async () => {
    const result = await run("synthetic-search-discovery.json", {
        query: "Ada Fielding",
        candidate_discovery: true,
        limit: 2,
    });

    // Live drill: 1 index hit + 2 discovered people, receipt 11 = 1 + 5 + 5.
    // One of the two went straight to `ready` between ticks, so a fold keyed
    // on observed builds settled 7.
    assertEquals(result.usage, {
        credits: { default: 11 },
        evidence: { CREDIT: 11 },
    });
});

Deno.test("orbit#v3/search: a search answered on the submit settles its receipt without a poll", async () => {
    const result = await run("synthetic-search-indexed.json", {
        query: "machine learning engineers",
        limit: 12,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { CREDIT: 2 },
    });
});

Deno.test("orbit#v3/search: a ZERO receipt settles zero", async () => {
    const result = await run("synthetic-search-empty.json", {
        query: "nobody at all",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, {});
});

Deno.test("orbit#v3/search: a terminal status with an OPEN receipt is read again", async () => {
    const result = await run("synthetic-search-receipt-open.json", {
        query: "Ada Fielding",
    });

    // The run is financially terminal when the receipt is. The first
    // terminal read carries consumed 0 and status open; settling there would
    // bill nothing for a search Orbit charged 1 for.
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
});

Deno.test("orbit#v3/search: a failed search is ours/theirs, and bills nothing", async () => {
    const result = await run("synthetic-search-failed.json", {
        signals: { phone: "+1-555-0100" },
        candidate_discovery: true,
    });
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "discovery_unavailable");
    assertEquals(
        output.message,
        "Candidate Discovery could not resolve the signals",
    );
});

Deno.test("orbit#v3/search: a submit-time failure reads like a poll-time one", async () => {
    const result = await run("synthetic-search-failed-on-submit.json", {
        signals: { address: "12 Vine Street" },
    });
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "signals_unresolvable");
    assertEquals(
        output.message,
        "The address could not be resolved to a person",
    );
});

Deno.test("orbit#v3/search: a failed status LOOKUP keeps the run alive", async () => {
    const result = await run("synthetic-search-transient.json", {
        query: "Ada Fielding",
    });

    // The 599 is the STATUS ROUTE failing, not the search, and it is a 599
    // on purpose: every temporary server failure is one retry class.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
});

Deno.test("orbit#v3/search: a vendor refusal is zero-billed data", async () => {
    const result = await run("synthetic-provider-error.json", {
        query: "Ada Fielding",
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "developer_api_credits_insufficient",
    );
});

Deno.test("orbit#v3/search estimate: the ceiling the caller authorized", async () => {
    // From Orbit's published card — GET
    // https://api.orbitsearch.com/v2/developer/pricing, version 2026-09-17:
    // index_search 1 per 10 results, partial_profile 5, full_profile 10.
    const unit = await testSealedUnit(ID);

    // Defaults bind at the schema: limit 20 ⇒ 2 blocks + 20 partial builds.
    const bare = await estimateEndpoint(unit, { body: { query: "Ada" } });
    assertEquals(bare, {
        credits: { default: 102 },
        evidence: { CREDIT: 102 },
    });

    const deep = await estimateEndpoint(unit, {
        body: { query: "Ada", limit: 100, profile_depth: "full" },
    });
    assertEquals(deep.credits, { default: 1010 });

    // Discovery widens the authorization beyond `limit`: 1 block + 14 x 5.
    const discovering = await estimateEndpoint(unit, {
        body: {
            signals: { email: "ada@northwind-instruments.example" },
            candidate_discovery: true,
            candidate_discovery_limit: 4,
            limit: 10,
        },
    });
    assertEquals(discovering.credits, { default: 71 });
});

Deno.test("orbit#v3/search: the mirror binds Orbit's defaults, and the budget covers a measured full build", async () => {
    const unit = await testSealedUnit(ID);
    const body = unit.doc.input.schema.body as {
        properties?: Record<string, { default?: unknown }>;
        required?: string[];
    };
    assert(body.properties);
    for (const field of ["query", "intent", "signals"]) {
        assert(field in body.properties, `${field} is part of the mirror`);
    }
    assertEquals(body.properties.limit.default, 20);
    assertEquals(body.properties.profile_depth.default, "partial");
    assertEquals(body.properties.candidate_discovery.default, false);
    assertEquals(body.properties.candidate_discovery_limit.default, 10);
    assertEquals(body.properties.include_profile.default, true);
    assertEquals(body.required, undefined);
    // Full-depth builds were measured at 24 to 27 minutes.
    assert(unit.doc.timeouts.runMs >= 27 * 60_000);
});

Deno.test("orbit#v3/search: the gate rejects limit 101, and passes 100", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-search-indexed.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { query: "Ada", limit: 101 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { body: { query: "Ada", limit: 100 } },
        mode: "replay",
        fixture,
    });
});

Deno.test("orbit#v3/search: the gate rejects what the published contract does not carry", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-search-indexed.json`);
    const rejected = (body: Json) =>
        assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );

    // The live API accepts all three; the published contract carries none.
    // A face search draws 100 credits the estimate never promised.
    await rejected({
        query: "Ada",
        signals: { face_source: { image_url: "https://x.example/a.jpg" } },
    });
    // Pushes whole profiles to the KEY HOLDER's webhook endpoints.
    await rejected({ query: "Ada", webhooks: true });
    // Overrides the engine's Idempotency-Key, in a namespace every caller
    // on the broker's one API key shares.
    await rejected({ query: "Ada", request_id: "search-ml-sf-001" });

    await assertInputAccepted({
        unit,
        input: { body: { query: "Ada", signals: { usernames: ["ada"] } } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "orbit#v3/search live: a named person settles on Orbit's receipt",
    ignore: liveSkip("orbit"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { query: "Sam Altman", limit: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const pools = Object.keys(result.usage.credits);
        assert(pools.length === 0 || pools.join() === "default", pools.join());
        const output = result.output as Record<string, unknown>;
        assert(Array.isArray(output.results));
    },
});
