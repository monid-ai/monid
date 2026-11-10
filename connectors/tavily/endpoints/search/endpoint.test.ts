import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

Deno.test("tavily#search: admission estimates follow native credit rules", async () => {
    const unit = await testSealedUnit("tavily#search");
    const cases: [Json, number][] = [
        [{ "query": "test" }, 1],
        [{ "query": "test", "search_depth": "advanced" }, 2],
        [{ "query": "test", "search_depth": "fast" }, 1],
        [{ "query": "test", "search_depth": "ultra-fast" }, 1],
        [{ "query": "test", "auto_parameters": true }, 2],
        [
            {
                "query": "test",
                "auto_parameters": true,
                "search_depth": "basic",
            },
            1,
        ],
    ];
    for (const [body, credits] of cases) {
        assertEquals(await estimateEndpoint(unit, { body }), {
            credits: { default: credits },
            evidence: { CREDIT: credits },
        });
    }
});

Deno.test("tavily#search: invalid inputs fail before any provider call", async () => {
    const unit = await testSealedUnit("tavily#search");
    const invalid: Json[] = [
        { "query": "test", "max_results": 21 },
        { "query": "test", "max_results": -1 },
        { "query": "test", "search_depth": "invalid" },
        { "query": "test", "chunks_per_source": 4 },
        {
            "query": "test",
            "include_domains": Array(301).fill("example.com"),
        },
        {},
    ];
    for (const body of invalid) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
    // Accepted boundaries are exercised through the same compiled validation.
    const valid: Json[] = [
        { "query": "test" },
        { "query": "test", "search_depth": "advanced" },
        { "query": "test", "search_depth": "fast" },
        { "query": "test", "search_depth": "ultra-fast" },
        { "query": "test", "auto_parameters": true },
        { "query": "test", "auto_parameters": true, "search_depth": "basic" },
    ];
    for (const body of valid) {
        assert((await estimateEndpoint(unit, { body })).credits.default > 0);
    }
});

Deno.test({
    name: "tavily#search live (gated on TAVILY_CREDENTIALS_API_KEY)",
    ignore: liveSkip("tavily"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("tavily#search"),
            input: {
                body: {
                    "query": "What is Tavily?",
                    "max_results": 2,
                    "search_depth": "basic",
                },
            },
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, Json>;
        assert(Array.isArray(output.results) && output.results.length > 0);
        assert(typeof output.request_id === "string");
        assert(!("usage" in output));
        const credits = result.usage.credits.default ?? 0;
        assert(Number.isFinite(credits) && credits >= 0);
        assertEquals(
            result.usage.evidence,
            credits === 0 ? {} : { CREDIT: credits },
        );
    },
});
