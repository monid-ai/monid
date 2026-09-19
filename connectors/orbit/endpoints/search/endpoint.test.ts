import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("orbit#v3/search: the poll's build observations settle the depth line", async () => {
    const unit = await testSealedUnit("orbit#v3/search");
    const result = await runEndpoint({
        unit,
        input: {
            body: { query: "founder of Northwind Instruments", limit: 5 },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-search-async.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // Two non-failed index results ⇒ one index_search block (1 credit).
    // PROF_BUILT_1 was seen `generating` then `enriching`, so it is a
    // profile Orbit BUILT ⇒ one partial_profile (5). Total 6.
    assertEquals(result.usage, {
        credits: { default: 6 },
        evidence: { index_search: 2, partial_profile: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    assertEquals((output.results as unknown[]).length, 2);
});

Deno.test("orbit#v3/search: a search answered from the index bills NO build", async () => {
    const unit = await testSealedUnit("orbit#v3/search");
    const result = await runEndpoint({
        unit,
        input: { body: { query: "machine learning engineers", limit: 12 } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-search-indexed.json`),
    });

    // THE regression this file exists for: twelve people read straight out
    // of the index settle two blocks (ceil(12/10)) and nothing else. A
    // settle keyed on the depth REACHED would bill 12 x 5 here.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { index_search: 12 },
    });
});

Deno.test("orbit#v3/search: a candidate merely RESOLVED settles at 1, not at a build price", async () => {
    const unit = await testSealedUnit("orbit#v3/search");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                signals: { address: "12 Vine Street, Brooklyn NY" },
                candidate_discovery: true,
                candidate_discovery_limit: 5,
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-search-discovery.json`),
    });

    // One index hit ⇒ one block; two discovered people that were never seen
    // mid-build ⇒ two candidate_discovery. 1 + 2 = 3.
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { index_search: 1, candidate_discovery: 2 },
    });
});

Deno.test("orbit#v3/search: a failed search is ours/theirs, and bills nothing", async () => {
    const unit = await testSealedUnit("orbit#v3/search");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                signals: { phone: "+1-555-0100" },
                candidate_discovery: true,
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-search-failed.json`),
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

Deno.test("orbit#v3/search: `sources` is a union, and a discovery row stays off the cached line", async () => {
    const unit = await testSealedUnit("orbit#v3/search");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "people at Northwind",
                candidate_discovery: true,
                limit: 10,
            },
        },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-search-union-origins.json`,
        ),
    });

    // Ten cached results ⇒ one block. The eleventh carries BOTH origins, and
    // Orbit excludes discovery rows from the cached-result count — so it
    // belongs on the discovery line alone. Counting it twice would round the
    // cached count up to a second block and settle 3.
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { index_search: 10, candidate_discovery: 1 },
    });
});

Deno.test("orbit#v3/search: a submit-time failure reads like a poll-time one", async () => {
    const unit = await testSealedUnit("orbit#v3/search");
    const result = await runEndpoint({
        unit,
        input: { body: { signals: { address: "12 Vine Street" } } },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-search-failed-on-submit.json`,
        ),
    });

    // The snapshot reports its reason at `candidate_discovery_failure`,
    // which the provider's fromError does not read. Handing it back raw
    // would publish "Orbit API error" and strand the reason in `raw`.
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
    const unit = await testSealedUnit("orbit#v3/search");
    const result = await runEndpoint({
        unit,
        input: { body: { query: "Ada Fielding" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-search-transient.json`),
    });

    // The 599 is the STATUS ROUTE failing, not the search — and it is a 599
    // on purpose: Orbit's error guide puts every temporary server failure in
    // one retry class, so a proxy status outside the common four has to be
    // held exactly like a 503. Settling there would abandon a search Orbit
    // still bills us for, so the poll backs off — honoring the Retry-After
    // the fixture sends — and the next tick reads the completed snapshot.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { index_search: 1 },
    });
});

Deno.test("orbit#v3/search: a vendor refusal is zero-billed data", async () => {
    const unit = await testSealedUnit("orbit#v3/search");
    const result = await runEndpoint({
        unit,
        input: { body: { query: "Ada Fielding" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-provider-error.json`),
    });

    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "developer_api_credits_insufficient");
});

Deno.test("orbit#v3/search estimate: the ceiling the caller authorized", async () => {
    // Rates pinned from Orbit's own rate card —
    // GET https://api.orbitsearch.com/v2/developer/pricing, version
    // 2026-09-17 (unauthenticated): index_search 1 per 10 results,
    // candidate_discovery 1, partial_profile 5, full_profile 10.
    const unit = await testSealedUnit("orbit#v3/search");

    // Defaults bind at the schema, so a bare query still estimates a
    // concrete cap: limit 20 ⇒ 2 blocks + 20 partial builds = 102.
    const bare = await estimateEndpoint(unit, { body: { query: "Ada" } });
    assertEquals(bare, {
        credits: { default: 102 },
        evidence: { index_search: 20, partial_profile: 20 },
    });

    // Full depth over a hundred people is the number worth seeing BEFORE
    // the run: 10 blocks + 100 full builds = 1,010 credits.
    const deep = await estimateEndpoint(unit, {
        body: { query: "Ada", limit: 100, profile_depth: "full" },
    });
    assertEquals(deep.credits, { default: 1010 });

    // Discovery widens the authorization beyond `limit`.
    const discovering = await estimateEndpoint(unit, {
        body: {
            signals: { email: "ada@northwind-instruments.example" },
            candidate_discovery: true,
            candidate_discovery_limit: 4,
            limit: 10,
        },
    });
    assertEquals(discovering.evidence, {
        index_search: 10,
        partial_profile: 14,
    });
});

Deno.test("orbit#v3/search: the mirror carries what Orbit accepts, and binds its defaults", async () => {
    const unit = await testSealedUnit("orbit#v3/search");
    const body = unit.doc.input.schema.body as {
        properties?: Record<string, { default?: unknown }>;
        required?: string[];
    };
    assert(body.properties);
    for (const field of ["query", "intent", "signals", "request_id"]) {
        assert(field in body.properties, `${field} is part of the mirror`);
    }
    // Orbit's own documented defaults, materialized before any hook runs so
    // the estimate reads numbers rather than guessing at them.
    assertEquals(body.properties.limit.default, 20);
    assertEquals(body.properties.profile_depth.default, "partial");
    assertEquals(body.properties.candidate_discovery.default, false);
    assertEquals(body.properties.candidate_discovery_limit.default, 10);
    assertEquals(body.properties.include_profile.default, true);
    // `query | intent | signals` is a cross-field rule Orbit enforces with a
    // 400; it lives in the descriptions rather than in a refinement that
    // would vanish at JSON Schema compilation.
    assertEquals(body.required, undefined);
});

Deno.test({
    name: "orbit#v3/search live: a named person settles against the real card",
    ignore: liveSkip("orbit"),
    fn: async () => {
        const unit = await testSealedUnit("orbit#v3/search");
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
        // Credits cannot be pinned live — what a query returns is the
        // search's answer, not its question. Assert the SHAPE instead: a
        // settled run draws from the one declared pool and nothing else.
        const pools = Object.keys(result.usage.credits);
        assert(pools.length === 0 || pools.join() === "default", pools.join());
    },
});
