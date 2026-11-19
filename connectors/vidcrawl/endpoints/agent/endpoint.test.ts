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

Deno.test("vidcrawl#v1/agent happy low effort (synthetic): $0.027 estimate & settle", async () => {
    const unit = await testSealedUnit("vidcrawl#v1/agent");
    const est = await estimateEndpoint(unit, {
        body: {
            prompt: "Summarize the pricing tiers.",
            urls: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
        },
    });
    assertEquals(est.credits, { default: 0.027 });

    const fixture = await loadFixture(`${fixturesDir}synthetic-agent-ok.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                prompt: "Summarize the pricing tiers shown in this video.",
                urls: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
                effort: "low",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.027 },
        evidence: { CALL: 1 },
    });
    const output = result.output as { citations: unknown[] };
    assertEquals(output.citations.length, 1);
});

Deno.test("vidcrawl#v1/agent medium effort (synthetic): vendor claim $0.045 settles", async () => {
    const unit = await testSealedUnit("vidcrawl#v1/agent");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-agent-medium-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                prompt: "Extract structured pricing tiers.",
                urls: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
                effort: "medium",
                schema: {
                    type: "object",
                    properties: { starter_usd: { type: "number" } },
                },
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 0.045 });
});

Deno.test("vidcrawl#v1/agent input validation: prompt, urls bounds, effort enum, strict keys", async () => {
    const unit = await testSealedUnit("vidcrawl#v1/agent");
    const fixture = await loadFixture(`${fixturesDir}synthetic-agent-ok.json`);
    const rejected: Json[] = [
        {},
        { prompt: "   ", urls: ["https://www.youtube.com/watch?v=abc"] },
        { prompt: "ok", urls: [] },
        {
            prompt: "ok",
            urls: Array.from(
                { length: 11 },
                (_, i) => `https://www.youtube.com/watch?v=id${i}`,
            ),
        },
        {
            prompt: "ok",
            urls: ["https://www.youtube.com/watch?v=abc"],
            effort: "max",
        },
        {
            prompt: "ok",
            urls: ["https://www.youtube.com/watch?v=abc"],
            extra: true,
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
});

Deno.test({
    name: "vidcrawl#v1/agent live (gated on VIDCRAWL_API_KEY)",
    ignore: liveSkip("vidcrawl"),
    fn: async () => {
        const unit = await testSealedUnit("vidcrawl#v1/agent");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    prompt: "What is the main topic of this video?",
                    urls: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
                    effort: "low",
                },
            },
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assert(typeof result.usage.credits.default === "number");
    },
});
