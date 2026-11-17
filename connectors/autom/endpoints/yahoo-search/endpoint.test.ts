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
const input = { "queryParams": { "query": "weather paris" } };

Deno.test("autom#v1/yahoo/search happy (synthetic): 1 credit; payload rides through", async () => {
    const unit = await testSealedUnit("autom#v1/yahoo/search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-yahoo-search-ok.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("autom#v1/yahoo/search provider error (synthetic 401): data, zero usage", async () => {
    const unit = await testSealedUnit("autom#v1/yahoo/search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-yahoo-search-unauthorized.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("autom#v1/yahoo/search: query required; unknown keys rejected", async () => {
    const unit = await testSealedUnit("autom#v1/yahoo/search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-yahoo-search-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        {},
        { "query": "weather paris", "bogus": 1 },
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
    name: "autom#v1/yahoo/search live (gated on AUTOM_API_KEY)",
    ignore: liveSkip("autom"),
    fn: async () => {
        const unit = await testSealedUnit("autom#v1/yahoo/search");
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});
