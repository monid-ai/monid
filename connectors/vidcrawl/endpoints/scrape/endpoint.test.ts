import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("vidcrawl bundle: 4 endpoints, x-api-key auth, USD credits, shared consolidate & fromError", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("vidcrawl#"))
        .sort();
    assertEquals(ids, [
        "vidcrawl#v1/agent",
        "vidcrawl#v1/frames",
        "vidcrawl#v1/scrape",
        "vidcrawl#v1/search",
    ]);

    const provider = bundle.providers.vidcrawl;
    assertEquals(provider.meta.displayName, "VidCrawl");

    const scrape = bundle.endpoints["vidcrawl#v1/scrape"];
    const frames = bundle.endpoints["vidcrawl#v1/frames"];
    const search = bundle.endpoints["vidcrawl#v1/search"];
    const agent = bundle.endpoints["vidcrawl#v1/agent"];

    assertEquals(scrape.request.url, "https://vidcrawl.com/v1/scrape");
    assertEquals(frames.request.url, "https://vidcrawl.com/v1/frames");
    assertEquals(search.request.url, "https://vidcrawl.com/v1/search");
    assertEquals(agent.request.url, "https://vidcrawl.com/v1/agent");

    for (const doc of [scrape, frames, search, agent]) {
        assertEquals(doc.auth.inject.$fn.key, scrape.auth.inject.$fn.key);
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            scrape.usage.consolidate?.$fn.key,
        );
        assertEquals(
            doc.output.fromError?.$fn.key,
            scrape.output.fromError?.$fn.key,
        );
        assertEquals(doc.usage.credits.default.label, "US dollars");
    }

    assertEquals(scrape.usage.model, {
        kind: "PER_CALL",
        label: "call",
        consumes: { credit: "default", amount: 0.009 },
    });
    assertEquals(frames.usage.model, {
        kind: "PER_CALL",
        label: "call",
        consumes: { credit: "default", amount: 0.009 },
    });
    assertEquals(search.usage.model, {
        kind: "PER_CALL",
        label: "call",
        consumes: { credit: "default", amount: 0.009 },
    });
    assertEquals(agent.usage.model, {
        kind: "PER_CALL",
        label: "call",
        consumes: { credit: "default", amount: 0.027 },
    });
});

Deno.test("vidcrawl#v1/scrape happy (synthetic): $0.009, preserves metrics & layers", async () => {
    const unit = await testSealedUnit("vidcrawl#v1/scrape");
    const est = await estimateEndpoint(unit, {
        body: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });
    assertEquals(est.credits, { default: 0.009 });

    const fixture = await loadFixture(`${fixturesDir}synthetic-scrape-ok.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                formats: ["markdown", "segments", "storyboard"],
                lang: "en",
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
    const output = result.output as Record<string, unknown>;
    assertEquals(output.ok, true);
    assertEquals(output.platform, "youtube");
    assertEquals(output.video_id, "dQw4w9WgXcQ");
});

Deno.test("vidcrawl#v1/scrape provider error (synthetic 401): normalized error, zero usage", async () => {
    const unit = await testSealedUnit("vidcrawl#v1/scrape");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "A valid API key is required.",
        code: "UNAUTHORIZED",
        raw: {
            ok: false,
            error: {
                code: "UNAUTHORIZED",
                message: "A valid API key is required.",
            },
        },
    });
});

Deno.test("vidcrawl#v1/scrape input validation: strict object & field bounds", async () => {
    const unit = await testSealedUnit("vidcrawl#v1/scrape");
    const fixture = await loadFixture(`${fixturesDir}synthetic-scrape-ok.json`);
    const rejected: Json[] = [
        {},
        { url: "ftp://example.com/video" },
        { url: "not-a-url" },
        { url: "https://www.youtube.com/watch?v=abc", formats: [] },
        { url: "https://www.youtube.com/watch?v=abc", formats: ["audio"] },
        { url: "https://www.youtube.com/watch?v=abc", lang: "1" },
        { url: "https://www.youtube.com/watch?v=abc", max_age_sec: -1 },
        { url: "https://www.youtube.com/watch?v=abc", max_age_sec: 31_536_001 },
        { url: "https://www.youtube.com/watch?v=abc", extra: true },
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
                url: "https://www.tiktok.com/@scout2015/video/6718335390845095173",
                formats: ["markdown"],
                lang: "zh-Hans",
                max_age_sec: 0,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test({
    name: "vidcrawl#v1/scrape live (gated on VIDCRAWL_API_KEY)",
    ignore: liveSkip("vidcrawl"),
    fn: async () => {
        const unit = await testSealedUnit("vidcrawl#v1/scrape");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    formats: ["markdown"],
                },
            },
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assert(typeof result.usage.credits.default === "number");
    },
});
