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
const ID = "vela-breakout#breakouts";

Deno.test("vela-breakout#breakouts happy (synthetic): params ride the query string; $0.02; rows relayed", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-breakouts-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        // the fixture URL proves the wire form:
        // ?group=ai_apps&window_days=30&limit=3
        input: { queryParams: { group: "ai_apps", window_days: 30, limit: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // no consolidate ⇒ the derived fold settles
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, Json>;
    assertEquals(output.group, "AI apps");
    assertEquals(output.measured_as_of, "2026-10-11");
    const rows = output.rows as Record<string, Json>[];
    assertEquals(rows.length, 3);
    assertEquals(rows[0].growth, "67×");
    assertEquals(rows[0].against_peers, "Faster than 99% of AI apps");
});

Deno.test("vela-breakout#breakouts estimate: $0.02 whatever the limit", async () => {
    const unit = await testSealedUnit(ID);
    for (const limit of [1, 25]) {
        assertEquals(
            await estimateEndpoint(unit, {
                queryParams: { group: "agent_tools", limit },
            }),
            { credits: { default: 0.02 }, evidence: { CALL: 1 } },
        );
    }
});

Deno.test("vela-breakout#breakouts 401 (synthetic): data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-breakouts-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { group: "ai_apps", limit: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("vela-breakout#breakouts: group required and closed; window, limit, min_size bounded; unknown keys rejected", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-breakouts-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        {},
        { group: "ai_startups" },
        { group: "ai_apps", window_days: 14 },
        { group: "ai_apps", limit: 0 },
        { group: "ai_apps", limit: 26 },
        { group: "ai_apps", min_size: "p90" },
        { group: "ai_apps", steady: "yes" },
        { group: "ai_apps", bogus: 1 },
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
    } // the accepted twins of the rejected values above
    assertEquals(
        await estimateEndpoint(unit, {
            queryParams: {
                group: "ai_apps",
                window_days: 365,
                limit: 25,
                min_size: "p75",
                steady: true,
            },
        }),
        { credits: { default: 0.02 }, evidence: { CALL: 1 } },
    );
});

Deno.test({
    name:
        "vela-breakout#breakouts live (gated on VELA_BREAKOUT_CREDENTIALS_API_KEY)",
    ignore: liveSkip("vela-breakout"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { group: "ai_apps", limit: 3 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
        const output = result.output as Record<string, Json>;
        assertEquals(Array.isArray(output.rows), true);
    },
});
