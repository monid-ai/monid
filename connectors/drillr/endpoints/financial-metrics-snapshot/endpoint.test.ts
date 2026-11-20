import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("drillr#financial-metrics-snapshot happy (recorded): two tickers in one comma string are ONE call; flat 0.02 credits", async () => {
    const unit = await testSealedUnit("drillr#financial-metrics-snapshot");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                ticker: "AAPL,7203.T",
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
    // rows come back in ascending ticker order, not request order
    assertEquals(output.data.map((row) => row.ticker), ["7203.T", "AAPL"]);
    assertEquals(output.data[1].dividend_frequency, "Quarterly");
});

Deno.test("drillr#financial-metrics-snapshot provider error (synthetic 404): data, zero usage", async () => {
    const unit = await testSealedUnit("drillr#financial-metrics-snapshot");
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
    name: "drillr#financial-metrics-snapshot live (gated on DRILLR_API_KEY)",
    ignore: liveSkip("drillr"),
    fn: async () => {
        const unit = await testSealedUnit("drillr#financial-metrics-snapshot");
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    ticker: "AAPL",
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
