import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "velabreakout#ideas";

Deno.test("velabreakout#ideas happy (synthetic): direction + limit on the wire; $0.02; ideas relayed", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-ideas-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { direction: "rising", limit: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as Record<string, Json>;
    assertEquals("billing" in output, false);
    const ideas = output.ideas as Record<string, Json>[];
    assertEquals(ideas.length, 2);
    assertEquals(ideas[0].idea, "Agentic systems and tool use");
    assertEquals(ideas[0].change, "+0.9 points");
});

Deno.test("velabreakout#ideas empty ideas (synthetic 200): free, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-ideas-empty.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { direction: "fading", limit: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
    assertEquals((result.output as Record<string, Json>).ideas, []);
});

Deno.test("velabreakout#ideas 401 (synthetic): data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-ideas-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { direction: "rising" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("velabreakout#ideas: direction required and closed; limit bounded", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-ideas-ok.json`);
    const rejected: Record<string, Json>[] = [
        {},
        { direction: "up" },
        { direction: "rising", limit: 26 },
        { direction: "rising", bogus: true },
    ];
    for (const queryParams of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(queryParams),
        );
    } // the accepted twins of the rejected limit above
    for (const limit of [1, 25]) {
        assertEquals(
            await estimateEndpoint(unit, {
                queryParams: { direction: "rising", limit },
            }),
            { credits: { default: 0.02 }, evidence: { RESULT: 1 } },
            String(limit),
        );
    }
});

Deno.test({
    name: "velabreakout#ideas live (gated on VELABREAKOUT_CREDENTIALS_API_KEY)",
    ignore: liveSkip("velabreakout"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { direction: "fading", limit: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: `ideas: []` is a valid, free 200
        const output = result.output as Record<string, Json>;
        assertEquals(Array.isArray(output.ideas), true);
    },
});
