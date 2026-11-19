import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("vidcrawl#v1/frames happy (synthetic): $0.009, returns timestamped JPEG frames", async () => {
    const unit = await testSealedUnit("vidcrawl#v1/frames");
    const est = await estimateEndpoint(unit, {
        body: {
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            timestamps_sec: [12.5, 45],
        },
    });
    assertEquals(est.credits, { default: 0.009 });

    const fixture = await loadFixture(`${fixturesDir}synthetic-frames-ok.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                timestamps_sec: [12.5, 45],
                max_width: 1280,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.009 },
        evidence: { CALL: 1 },
    });
    const output = result.output as { frames: unknown[] };
    assertEquals(output.frames.length, 2);
});

Deno.test("vidcrawl#v1/frames input validation: timestamps bounds & strict keys", async () => {
    const unit = await testSealedUnit("vidcrawl#v1/frames");
    const fixture = await loadFixture(`${fixturesDir}synthetic-frames-ok.json`);
    const rejected: Json[] = [
        {},
        { url: "https://www.youtube.com/watch?v=abc" },
        { url: "https://www.youtube.com/watch?v=abc", timestamps_sec: [] },
        { url: "https://www.youtube.com/watch?v=abc", timestamps_sec: [-1] },
        {
            url: "https://www.youtube.com/watch?v=abc",
            timestamps_sec: Array.from({ length: 21 }, (_, i) => i),
        },
        {
            url: "https://www.youtube.com/watch?v=abc",
            timestamps_sec: [0],
            max_width: 319,
        },
        {
            url: "https://www.youtube.com/watch?v=abc",
            timestamps_sec: [0],
            max_width: 1921,
        },
        {
            url: "https://www.youtube.com/watch?v=abc",
            timestamps_sec: [0],
            extra: 1,
        },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }

    const ok = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://www.youtube.com/watch?v=abc",
                timestamps_sec: [0, 19.5],
                max_width: 1920,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test({
    name: "vidcrawl#v1/frames live (gated on VIDCRAWL_API_KEY)",
    ignore: liveSkip("vidcrawl"),
    fn: async () => {
        const unit = await testSealedUnit("vidcrawl#v1/frames");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    timestamps_sec: [10],
                    max_width: 640,
                },
            },
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assert(typeof result.usage.credits.default === "number");
    },
});
