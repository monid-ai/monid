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
const input = { "queryParams": { "asin": "B0CZY1LRT4", "marketplace": "com" } };

Deno.test("asin#offers happy (synthetic): free; payload rides through", async () => {
    const unit = await testSealedUnit("asin#offers");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-offers-ok.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("asin#offers provider error (synthetic 401): data, zero usage", async () => {
    const unit = await testSealedUnit("asin#offers");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-offers-unauthorized.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("asin#offers: asin required; unknown keys rejected", async () => {
    const unit = await testSealedUnit("asin#offers");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-offers-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        {},
        { "asin": "B0CZY1LRT4", "marketplace": "com", "bogus": 1 },
    ];
    for (const params of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams: params },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(params),
        );
    }
});

Deno.test({
    name: "asin#offers live (gated on ASIN_API_KEY)",
    ignore: liveSkip("asin"),
    fn: async () => {
        const unit = await testSealedUnit("asin#offers");
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});
