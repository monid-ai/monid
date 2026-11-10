import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

Deno.test("tavily#crawl: admission estimates follow native credit rules", async () => {
    const unit = await testSealedUnit("tavily#crawl");
    const cases: [Json, number][] = [
        [{ "url": "https://example.com", "limit": 1 }, 2],
        [{ "url": "https://example.com", "limit": 10 }, 3],
        [{ "url": "https://example.com", "limit": 11 }, 5],
        [{
            "url": "https://example.com",
            "limit": 10,
            "extract_depth": "advanced",
            "instructions": "Find docs",
        }, 6],
    ];
    for (const [body, credits] of cases) {
        assertEquals(await estimateEndpoint(unit, { body }), {
            credits: { default: credits },
            evidence: { CREDIT: credits },
        });
    }
});

Deno.test("tavily#crawl: invalid inputs fail before any provider call", async () => {
    const unit = await testSealedUnit("tavily#crawl");
    const invalid: Json[] = [
        { "url": "https://example.com" },
        { "url": "https://example.com", "limit": 0 },
        { "url": "https://example.com", "limit": 1, "max_breadth": 501 },
        {
            "url": "https://example.com",
            "limit": 1,
            "extract_depth": "invalid",
        },
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
        { "url": "https://example.com", "limit": 1 },
        { "url": "https://example.com", "limit": 10 },
        { "url": "https://example.com", "limit": 11 },
        {
            "url": "https://example.com",
            "limit": 10,
            "extract_depth": "advanced",
            "instructions": "Find docs",
        },
    ];
    for (const body of valid) {
        assert((await estimateEndpoint(unit, { body })).credits.default > 0);
    }
});

Deno.test({
    name: "tavily#crawl live (gated on TAVILY_CREDENTIALS_API_KEY)",
    ignore: liveSkip("tavily"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("tavily#crawl"),
            input: {
                body: {
                    "url": "https://docs.tavily.com",
                    "limit": 1,
                    "max_depth": 1,
                    "allow_external": false,
                    "extract_depth": "basic",
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
