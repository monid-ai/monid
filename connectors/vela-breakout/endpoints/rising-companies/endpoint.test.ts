import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "vela-breakout#rising-companies";

Deno.test("vela-breakout#rising-companies happy (synthetic): limit on the wire; $0.02; companies relayed", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-rising-companies-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { limit: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { CALL: 1 },
    });
    const companies = (result.output as Record<string, Json>)
        .companies as Record<string, Json>[];
    assertEquals(companies.map((c) => c.domain), [
        "context7.com",
        "stepfun.com",
        "poolside.ai",
    ]);
    assertEquals(companies[1].rising_on, [
        "Model tokens",
        "Open model pull",
        "Forum points",
        "Web reach",
    ]);
});

Deno.test("vela-breakout#rising-companies 401 (synthetic): data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: {} },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("vela-breakout#rising-companies: limit bounded; unknown keys rejected", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-rising-companies-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        { limit: 0 },
        { limit: 26 },
        { limit: 2.5 },
        { group: "ai_apps" },
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
    }
});

Deno.test({
    name:
        "vela-breakout#rising-companies live (gated on VELA_BREAKOUT_API_KEY)",
    ignore: liveSkip("vela-breakout"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { limit: 3 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
    },
});
