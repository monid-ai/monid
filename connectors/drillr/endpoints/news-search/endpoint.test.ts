import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("drillr#news-search happy (recorded): the JSON body rides the POST; storylines and claims; flat 0.2 credits", async () => {
    const unit = await testSealedUnit("drillr#news-search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "export controls",
                ticker: "NVDA",
                top_k: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // drillr reports no meter: the pinned flat line is the whole settle
    assertEquals(result.usage, {
        credits: { default: 0.2 },
        evidence: { CALL: 1 },
    });
    // no `data` wrapper on this endpoint
    const output = result.output as Record<string, unknown>;
    assertEquals(output.count, 2);
    assertEquals(output.ticker, ["NVDA"]);
    assertEquals((output.results as unknown[]).length, 2);
});

Deno.test("drillr#news-search provider error (synthetic 429): data, zero usage", async () => {
    const unit = await testSealedUnit("drillr#news-search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "export controls",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).error,
        "rate_limit_exceeded",
    );
});

Deno.test({
    name: "drillr#news-search live (gated on DRILLR_API_KEY)",
    ignore: liveSkip("drillr"),
    fn: async () => {
        const unit = await testSealedUnit("drillr#news-search");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    ticker: "NVDA",
                    order_by: "create_time",
                    top_k: 2,
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
            credits: { default: 0.2 },
            evidence: { CALL: 1 },
        });
    },
});
