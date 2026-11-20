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

Deno.test("drillr#filings happy (recorded): filings newest first; flat 0.02 credits", async () => {
    const unit = await testSealedUnit("drillr#filings");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                ticker: "AAPL",
                limit: 3,
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
    assertEquals(output.data[0].form_type, "144");
    // US filings never carry a title
    assertEquals(output.data[0].title, null);
});

Deno.test("drillr#filings provider error (synthetic 404): data, zero usage", async () => {
    const unit = await testSealedUnit("drillr#filings");
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

Deno.test("drillr#filings: ticker is required and there is no form-type or date parameter", async () => {
    const unit = await testSealedUnit("drillr#filings");
    const rejected: RunInput["queryParams"][] = [
        {},
        // /filings has no filter beyond ticker — form_type belongs to
        // /filing-search
        { ticker: "AAPL", form_type: "10-K" },
        { ticker: "AAPL", from: "2026-01-01" },
        { ticker: "AAPL", limit: 501 },
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
    name: "drillr#filings live (gated on DRILLR_API_KEY)",
    ignore: liveSkip("drillr"),
    fn: async () => {
        const unit = await testSealedUnit("drillr#filings");
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
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
            credits: { default: 0.02 },
            evidence: { CALL: 1 },
        });
    },
});
