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
const input = { "queryParams": { "query": "https://example.com" } };

Deno.test("piloterr#v2/website/crawler happy (synthetic): 1 credit; payload rides through", async () => {
    const unit = await testSealedUnit("piloterr#v2/website/crawler");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-website-crawler-ok.json`,
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

Deno.test("piloterr#v2/website/crawler provider error (synthetic 401): data, zero usage", async () => {
    const unit = await testSealedUnit("piloterr#v2/website/crawler");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-website-crawler-unauthorized.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("piloterr#v2/website/crawler: query required; unknown keys rejected", async () => {
    const unit = await testSealedUnit("piloterr#v2/website/crawler");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-website-crawler-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        {},
        { "query": "https://example.com", "bogus": 1 },
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
    name: "piloterr#v2/website/crawler live (gated on PILOTERR_API_KEY)",
    ignore: liveSkip("piloterr"),
    fn: async () => {
        const unit = await testSealedUnit("piloterr#v2/website/crawler");
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});
