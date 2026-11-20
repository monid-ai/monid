import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("drillr#income-statements happy (recorded): one row per fiscal year; flat 0.02 credits", async () => {
    const unit = await testSealedUnit("drillr#income-statements");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                ticker: "AAPL",
                period: "FY",
                limit: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // drillr reports no meter: the pinned flat line is the whole settle
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { CALL: 1 },
    });
    const output = result.output as { data: Record<string, unknown>[] };
    assertEquals(output.data.length, 2);
    assertEquals(output.data[0].fiscal_year, 2026);
    assertEquals(output.data[0].revenue, 478834000000);
});

Deno.test("drillr#income-statements provider error (synthetic 404): data, zero usage", async () => {
    const unit = await testSealedUnit("drillr#income-statements");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                ticker: "00700.HK",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).error,
        "not_found",
    );
});

Deno.test({
    name: "drillr#income-statements live (gated on DRILLR_API_KEY)",
    ignore: liveSkip("drillr"),
    fn: async () => {
        const unit = await testSealedUnit("drillr#income-statements");
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    ticker: "AAPL",
                    limit: 1,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, {
            credits: { default: 0.02 },
            evidence: { CALL: 1 },
        });
    },
});
