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
const input = {
    "queryParams": { "url": "https://example.com", "include_markdown": true },
};

Deno.test("capturekit#v1/content happy (synthetic): 1 credit; payload rides through", async () => {
    const unit = await testSealedUnit("capturekit#v1/content");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-content-ok.json`,
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

Deno.test("capturekit#v1/content provider error (synthetic 401): data, zero usage", async () => {
    const unit = await testSealedUnit("capturekit#v1/content");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-content-unauthorized.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("capturekit#v1/content: url required; unknown keys rejected", async () => {
    const unit = await testSealedUnit("capturekit#v1/content");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-content-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        {},
        { "url": "https://example.com", "include_markdown": true, "bogus": 1 },
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
    name: "capturekit#v1/content live (gated on CAPTUREKIT_API_KEY)",
    ignore: liveSkip("capturekit"),
    fn: async () => {
        const unit = await testSealedUnit("capturekit#v1/content");
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});
