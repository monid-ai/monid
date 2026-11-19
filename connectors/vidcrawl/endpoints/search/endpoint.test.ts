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

Deno.test("vidcrawl#v1/search happy (synthetic): $0.009 live search", async () => {
    const unit = await testSealedUnit("vidcrawl#v1/search");
    const est = await estimateEndpoint(unit, {
        body: { query: "tanstack start tutorial" },
    });
    assertEquals(est.credits, { default: 0.009 });

    const fixture = await loadFixture(`${fixturesDir}synthetic-search-ok.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "tanstack start tutorial",
                platform: "youtube",
                limit: 2,
                scrape: false,
                source: "live",
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
    const output = result.output as { results: unknown[] };
    assertEquals(output.results.length, 2);
});

Deno.test("vidcrawl#v1/search input validation: query, limit, source & strict keys", async () => {
    const unit = await testSealedUnit("vidcrawl#v1/search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-search-ok.json`);
    const rejected: Json[] = [
        {},
        { query: "" },
        { query: "   " },
        { query: "a".repeat(201) },
        { query: "ok", limit: 0 },
        { query: "ok", limit: 21 },
        { query: "ok", platform: "instagram" },
        { query: "ok", source: "cache" },
        { query: "ok", domain: "   " },
        { query: "ok", extra: 1 },
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
                query: "python fastapi",
                source: "index",
                domain: "youtube.com",
                limit: 5,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test({
    name: "vidcrawl#v1/search live (gated on VIDCRAWL_API_KEY)",
    ignore: liveSkip("vidcrawl"),
    fn: async () => {
        const unit = await testSealedUnit("vidcrawl#v1/search");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    query: "deno workspace tutorial",
                    limit: 2,
                },
            },
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assert(typeof result.usage.credits.default === "number");
    },
});
