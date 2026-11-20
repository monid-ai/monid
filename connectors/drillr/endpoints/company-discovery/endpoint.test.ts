import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("drillr#company-discovery happy (recorded): a description returns ticker + reason rows; flat 3 credits", async () => {
    const unit = await testSealedUnit("drillr#company-discovery");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                query: "US companies that design GPUs for data centers",
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
        credits: { default: 3 },
        evidence: { CALL: 1 },
    });
    const output = result.output as { data: Record<string, unknown>[] };
    assertEquals(output.data[0].ticker, "NVDA");
    assertEquals(typeof output.data[0].reason, "string");
});

Deno.test("drillr#company-discovery provider error (synthetic 429): data, zero usage", async () => {
    const unit = await testSealedUnit("drillr#company-discovery");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                query: "lithography equipment makers",
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
    name: "drillr#company-discovery live (gated on DRILLR_API_KEY)",
    ignore: liveSkip("drillr"),
    fn: async () => {
        const unit = await testSealedUnit("drillr#company-discovery");
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    query: "US companies that design GPUs for data centers",
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
            credits: { default: 3 },
            evidence: { CALL: 1 },
        });
    },
});
