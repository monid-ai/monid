import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("drillr#events happy (recorded): one class of one company's events; flat 0.02 credits", async () => {
    const unit = await testSealedUnit("drillr#events");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                ticker: "BA",
                event_class: "capital",
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
    assertEquals(output.data[0].event_type, "debt_issuance");
    assertEquals(output.data[0].source_category, "8-K:1.01,2.03");
});

Deno.test("drillr#events provider error (recorded 404, US-only coverage): data, zero usage", async () => {
    const unit = await testSealedUnit("drillr#events");
    const fixture = await loadFixture(
        `${fixturesDir}provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                ticker: "7203.T",
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
    name: "drillr#events live (gated on DRILLR_API_KEY)",
    ignore: liveSkip("drillr"),
    fn: async () => {
        const unit = await testSealedUnit("drillr#events");
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    ticker: "BA",
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
