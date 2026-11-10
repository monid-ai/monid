import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "socialcrawl#v1/youtube/video/transcript";
const URL_ = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

Deno.test("socialcrawl#v1/youtube/video/transcript happy: 3 credits, segments ride through", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: URL_ } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { CREDIT: 3 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_used" in output, false);
    assertEquals("credits_remaining" in output, false);
    const transcript = (output.data as { transcript: { text: string }[] })
        .transcript;
    assertEquals(transcript.length, 2);
    assertEquals(transcript[1].text, "♪ We're no strangers to love ♪");
});

Deno.test("socialcrawl#v1/youtube/video/transcript cache hit: the documented sample settles at zero", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: URL_ } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-cache-hit.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    assertEquals(
        (result.output as { cached: boolean }).cached,
        true,
    );
});

Deno.test("socialcrawl#v1/youtube/video/transcript: schema gate", async () => {
    const unit = await testSealedUnit(ID);
    await assertRejects(
        () => estimateEndpoint(unit, { queryParams: { url: "" } }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        (await estimateEndpoint(unit, { queryParams: { url: URL_ } })).credits,
        { default: 3 },
    );
});

Deno.test("socialcrawl#v1/youtube/video/transcript: a missing caption track is a free 404", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: URL_ } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        ),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as {
        code: string;
        raw: { error: { details: { reason: string } } };
    };
    assertEquals(output.code, "RESOURCE_NOT_FOUND");
    assertEquals(output.raw.error.details.reason, "no_captions");
});

Deno.test({
    name:
        "socialcrawl#v1/youtube/video/transcript live (gated on SOCIALCRAWL_API_KEY)",
    ignore: liveSkip("socialcrawl"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { url: URL_ } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(
            typeof result.usage.credits.default,
            result.usage.evidence.CREDIT === 0 ? "undefined" : "number",
        );
    },
});
