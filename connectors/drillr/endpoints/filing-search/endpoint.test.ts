import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("drillr#filing-search happy (recorded): passages and facts partitions; flat 0.1 credits", async () => {
    const unit = await testSealedUnit("drillr#filing-search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                query: "share repurchase",
                ticker: "AAPL",
                form_type: "10-K",
                limit: 2,
                include_facts: true,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // drillr reports no meter: the pinned flat line is the whole settle
    assertEquals(result.usage, {
        credits: { default: 0.1 },
        evidence: { CALL: 1 },
    });
    // the one GET whose `data` is an object of two partitions
    const output = result.output as {
        data: Record<string, Record<string, unknown>[]>;
    };
    assertEquals(output.data.passages[0].section, "Share Repurchase Program");
    assertEquals(
        output.data.facts[0].xbrl_concept,
        "us-gaap:PaymentsForRepurchaseOfCommonStock",
    );
});

Deno.test("drillr#filing-search provider error (synthetic 404): data, zero usage", async () => {
    const unit = await testSealedUnit("drillr#filing-search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                query: "share repurchase",
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
    name: "drillr#filing-search live (gated on DRILLR_API_KEY)",
    ignore: liveSkip("drillr"),
    fn: async () => {
        const unit = await testSealedUnit("drillr#filing-search");
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    query: "share repurchase",
                    ticker: "AAPL",
                    limit: 2,
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
            credits: { default: 0.1 },
            evidence: { CALL: 1 },
        });
    },
});
