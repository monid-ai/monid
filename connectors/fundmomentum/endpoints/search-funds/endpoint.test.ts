import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("fixtures/", import.meta.url));

Deno.test("fundmomentum#mcp/search_funds happy (real recording): results wrapped in an object, billed per fund returned via the vendor's own receipt", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_funds");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { stage: "seed", country: "Germany", limit: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // Settled from the vendor's own _meta.credits_charged (provider
    // consolidate), not the flat 1-credit-per-call model this
    // connector shipped with originally: 3 funds returned, 3 credits.
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { RESULT: 3 },
    });
    const output = result.output as Record<string, unknown>;
    // The MCP envelope and its billing bookkeeping never reach the caller.
    assertEquals("content" in output, false);
    assertEquals("_meta" in output, false);
    const results = output.results as Record<string, unknown>[];
    assertEquals(results.length, 3);
    assertEquals(results[1].slug, "alstin-iii");
    assertEquals(output.returned, 3);
    assertEquals(output.matched, 45);
    assertEquals(output.truncated, true);
});

Deno.test("fundmomentum#mcp/search_funds: limit has a floor of 1, no client-side ceiling (the vendor's own tier cap applies server-side)", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_funds");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { limit: 0 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    const passing: Json[] = [
        {},
        { limit: 1 },
        { limit: 250 },
        { stage: "pre_seed", industry: "ai_ml" },
        { closed_since: "2026-09-01" },
        { limit: 50, offset: 50 },
    ];
    for (const body of passing) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(ok.isProviderError, false, JSON.stringify(body));
    }
});
