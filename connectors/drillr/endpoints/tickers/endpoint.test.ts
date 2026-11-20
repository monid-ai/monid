import { assertEquals, assertRejects } from "@std/assert";
import type { RunInput } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("drillr#tickers happy (recorded): a name resolves to one canonical row; flat 0.02 credits", async () => {
    const unit = await testSealedUnit("drillr#tickers");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                query: "Apple Inc.",
                market: "US",
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
    assertEquals(output.data.length, 1);
    assertEquals(output.data[0].ticker, "AAPL");
    assertEquals(output.data[0].exchange, "XNAS");
});

Deno.test("drillr#tickers provider error (synthetic 429): data, zero usage", async () => {
    const unit = await testSealedUnit("drillr#tickers");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                query: "Apple Inc.",
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

Deno.test("drillr#tickers: closed vocabularies and unknown keys are refused before the wire", async () => {
    const unit = await testSealedUnit("drillr#tickers");
    const rejected: RunInput["queryParams"][] = [
        // /tickers covers US / CN / JP only (HK is a discovery market)
        { query: "Tencent", market: "HK" },
        // the list is comma-separated with no spaces
        { market: "US, JP" },
        // list mode caps at 500
        { limit: 501 },
        // pages start at 1
        { page: 0 },
        // .strict() survives compilation
        { name: "Apple Inc." },
    ];
    for (const queryParams of rejected) {
        await assertRejects(
            // no fixture: the run must fail before any upstream call
            () => runEndpoint({ unit, input: { queryParams }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(queryParams),
        );
    }
});

Deno.test({
    name: "drillr#tickers live (gated on DRILLR_API_KEY)",
    ignore: liveSkip("drillr"),
    fn: async () => {
        const unit = await testSealedUnit("drillr#tickers");
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    query: "Apple Inc.",
                    market: "US",
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
