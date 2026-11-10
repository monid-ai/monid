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
    "queryParams": { "query": "https://www.youtube.com/watch?v=jNQXAC9IVRw" },
};

Deno.test("huntapi#v1/audio/download happy (synthetic): 1 credit; payload rides through", async () => {
    const unit = await testSealedUnit("huntapi#v1/audio/download");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-audio-download-ok.json`,
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

Deno.test("huntapi#v1/audio/download provider error (synthetic 401): data, zero usage", async () => {
    const unit = await testSealedUnit("huntapi#v1/audio/download");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-audio-download-unauthorized.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("huntapi#v1/audio/download: query required; unknown keys rejected", async () => {
    const unit = await testSealedUnit("huntapi#v1/audio/download");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-audio-download-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        {},
        { "query": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "bogus": 1 },
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
    name: "huntapi#v1/audio/download live (gated on HUNTAPI_API_KEY)",
    ignore: liveSkip("huntapi"),
    fn: async () => {
        const unit = await testSealedUnit("huntapi#v1/audio/download");
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});
