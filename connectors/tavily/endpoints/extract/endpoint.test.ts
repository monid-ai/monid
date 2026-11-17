import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

Deno.test("tavily#extract: admission estimates follow native credit rules", async () => {
    const unit = await testSealedUnit("tavily#extract");
    const cases: [Json, number][] = [[{ "urls": "https://example.com" }, 1], [{
        "urls": Array(5).fill("https://example.com"),
    }, 1], [{
        "urls": Array(6).fill("https://example.com"),
    }, 2], [{
        "urls": Array(20).fill("https://example.com"),
        "extract_depth": "advanced",
    }, 8]];
    for (const [body, credits] of cases) {
        assertEquals(await estimateEndpoint(unit, { body }), {
            credits: { default: credits },
            evidence: { CREDIT: credits },
        });
    }
});

Deno.test("tavily#extract: invalid inputs fail before any provider call", async () => {
    const unit = await testSealedUnit("tavily#extract");
    const invalid: Json[] = [
        { "urls": [] },
        {
            "urls": Array(21).fill("https://example.com"),
        },
        { "urls": "https://example.com", "timeout": 61 },
        { "urls": "https://example.com", "chunks_per_source": 6 },
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
    const valid: Json[] = [{ "urls": "https://example.com" }, {
        "urls": Array(5).fill("https://example.com"),
    }, {
        "urls": Array(6).fill("https://example.com"),
    }, {
        "urls": Array(20).fill("https://example.com"),
        "extract_depth": "advanced",
    }];
    for (const body of valid) {
        assert((await estimateEndpoint(unit, { body })).credits.default > 0);
    }
});

Deno.test({
    name: "tavily#extract live (gated on TAVILY_CREDENTIALS_API_KEY)",
    ignore: liveSkip("tavily"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("tavily#extract"),
            input: {
                body: {
                    "urls": "https://example.com",
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
