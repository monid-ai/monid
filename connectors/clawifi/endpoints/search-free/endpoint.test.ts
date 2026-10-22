import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "clawifi#search/free";
const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (synthetic): the vendor claim (1) and the flat fold agree; receipt plucked`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "example domain iana", max_results: 2 } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-search-free-ok.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // claim 1 == PER_CALL fold 1: no mismatch key
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_charged" in output, false);
    assertEquals(output.query, "example domain iana");
    assertEquals(output.provider, "free_auto");
    assertEquals((output.results as unknown[]).length, 2);
});

Deno.test(`${ID}: schema gate mirrors the vendor validators`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-free-ok.json`,
    );
    const rejected: Json[] = [
        {},
        { query: "" },
        { query: "x".repeat(501) },
        { query: "x", max_results: 0 },
        { query: "x", max_results: 51 },
        { query: "x", provider: "bing" },
        { query: "x", time_range: "hour" },
        { query: "x", country: "usa" },
        { query: "x", language: "e" },
        { query: "x", include_domains: Array(21).fill("example.com") },
        { query: "x", exclude_domains: Array(51).fill("example.com") },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    const passing: Json[] = [
        { query: "x" },
        { query: "x".repeat(500) },
        { query: "x", max_results: 1 },
        { query: "x", max_results: 50 },
        { query: "x", provider: "free_fused" },
        { query: "x", provider: "hn_algolia", time_range: "week" },
        { query: "x", country: "us", language: "en" },
        { query: "x", include_domains: Array(20).fill("example.com") },
        { query: "x", exclude_domains: Array(50).fill("example.com") },
    ];
    for (const body of passing) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test({
    name: `${ID} live (gated on CLAWIFI_API_KEY)`,
    ignore: liveSkip("clawifi"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: { query: "deno 2 workspace guide", max_results: 2 },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
        // the body meter arrived and was claimed (the request header works)
        assertEquals(result.usage.credits, { default: 1 });
        assertEquals(result.usage.mismatch, undefined);
        const output = result.output as Record<string, unknown>;
        assertEquals("credits_charged" in output, false);
        assertEquals(Array.isArray(output.results), true);
    },
});
