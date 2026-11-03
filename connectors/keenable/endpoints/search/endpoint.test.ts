import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("keenable: fetch inherits PER_CALL 1, search counts RESULT, one auth fn, no consolidate", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("keenable#")
    ).sort();
    assertEquals(ids, [
        "keenable#v1/fetch",
        "keenable#v1/fetch-answer",
        "keenable#v1/search",
        "keenable#v1/search-as-of",
        "keenable#v1/search-news",
    ]);

    const search = bundle.endpoints["keenable#v1/search"];
    const news = bundle.endpoints["keenable#v1/search-news"];
    const asOf = bundle.endpoints["keenable#v1/search-as-of"];
    const fetchDoc = bundle.endpoints["keenable#v1/fetch"];
    const answer = bundle.endpoints["keenable#v1/fetch-answer"];
    assertEquals(search.request.method, "POST");
    assertEquals(search.request.url, "https://api.keenable.ai/v1/search");
    assertEquals(news.request.url, "https://api.keenable.ai/v1/search");
    assertEquals(asOf.request.url, "https://api.keenable.ai/v1/search");
    assertEquals(fetchDoc.request.method, "GET");
    assertEquals(fetchDoc.request.url, "https://api.keenable.ai/v1/fetch");
    assertEquals(answer.request.url, "https://api.keenable.ai/v1/fetch");

    assertEquals(search.auth.inject.$fn.key, fetchDoc.auth.inject.$fn.key);
    assertEquals(search.usage.consolidate, undefined);
    assertEquals(fetchDoc.usage.consolidate, undefined);
    assertEquals(search.input.toRequest, undefined);
    assertEquals(news.input.toRequest, undefined);
    assertEquals(asOf.input.toRequest, undefined);
    assertEquals(fetchDoc.input.toRequest, undefined);
    assertEquals(answer.input.toRequest, undefined);

    // fetch: flat PER_CALL, compiler-synthesized empty quantities
    // (tinyfish/pdl enrich posture); engine appends CALL at settle
    const synthesizedKey = fetchDoc.usage.evidence.$fn.key;
    assertEquals(fetchDoc.usage.estimate.$fn.key, synthesizedKey);
    assertEquals(
        bundle.fnTable[synthesizedKey].provenance,
        "core#usage.synthesizedEmpty",
    );
    // search: its own 0|1 evidence (empty result bills 0); the three
    // search docs share one interned pair
    assert(search.usage.evidence.$fn.key !== synthesizedKey);
    assertEquals(search.usage.evidence.$fn.key, news.usage.evidence.$fn.key);
    assertEquals(search.usage.evidence.$fn.key, asOf.usage.evidence.$fn.key);

    const kinds: Record<string, string> = {
        "keenable#v1/fetch": "PER_CALL",
        "keenable#v1/fetch-answer": "PER_CALL",
        "keenable#v1/search": "PER_UNIT",
        "keenable#v1/search-as-of": "PER_UNIT",
        "keenable#v1/search-news": "PER_UNIT",
    };
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(Object.keys(doc.usage.credits), ["default"], id);
        const model = doc.usage.model;
        assertEquals(model.kind, kinds[id], id);
        assertEquals(
            "consumes" in model ? model.consumes : undefined,
            { credit: "default", amount: 1 },
            id,
        );
    }
});

Deno.test("keenable: agent-facing meta, news category, live-fallback fetch", async () => {
    const bundle = await testBundle();
    const provider = bundle.providers.keenable;
    assertEquals(provider.meta.displayName, "Keenable");
    assertEquals(
        provider.meta.summary,
        "Fast independent web search with long page-text extracts, plus clean page fetch.",
    );
    assertEquals(provider.meta.categories, [
        "web-search",
        "news-search",
        "web-scraping",
    ]);

    const search = bundle.endpoints["keenable#v1/search"];
    assertEquals(search.meta.displayName, "Keenable Web Search");
    assertEquals(search.meta.categories, ["web-search", "news-search"]);
    assert(
        search.meta.description?.includes("published_after"),
        "search description names the news filter",
    );
    assert(
        search.meta.description?.includes("keenable#v1/fetch"),
        "search description names the next endpoint",
    );

    const news = bundle.endpoints["keenable#v1/search-news"];
    assertEquals(news.meta.displayName, "Keenable News Search");
    assertEquals(news.meta.categories, ["news-search"]);

    const asOf = bundle.endpoints["keenable#v1/search-as-of"];
    assertEquals(asOf.meta.displayName, "Keenable Point-in-Time Search");
    assertEquals(asOf.meta.categories, ["web-search"]);

    const fetchDoc = bundle.endpoints["keenable#v1/fetch"];
    assertEquals(fetchDoc.meta.displayName, "Keenable Fetch");
    assertEquals(fetchDoc.meta.categories, [
        "web-scraping",
        "web-extraction",
    ]);
    assert(
        fetchDoc.meta.description?.includes("live"),
        "fetch description names live fallback",
    );

    const answer = bundle.endpoints["keenable#v1/fetch-answer"];
    assertEquals(answer.meta.displayName, "Keenable Page Answer");
    assertEquals(answer.meta.categories, ["web-extraction"]);
});

Deno.test("keenable#v1/search happy (synthetic): one credit; fold settles; mode echoed", async () => {
    const unit = await testSealedUnit("keenable#v1/search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-search-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "typescript best practices", max_results: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // no consolidate ⇒ no claim ⇒ the DERIVED fold is the bill (D2)
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("usage" in output, false);
    assertEquals("credits" in output, false);
    assertEquals("costDollars" in output, false);
    assertEquals(output.query, "typescript best practices");
    assertEquals(output.mode, "pro");
    assertEquals((output.results as unknown[]).length, 2);
});

Deno.test("keenable#v1/search empty (synthetic): results [] bills 0", async () => {
    const unit = await testSealedUnit("keenable#v1/search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-empty.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { query: "zzqxv no such page" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    assertEquals((result.output as Record<string, unknown>).results, []);
});

Deno.test("keenable#v1/search provider error (recorded 401): data, zero usage", async () => {
    const unit = await testSealedUnit("keenable#v1/search");
    const fixture = await loadFixture(`${fixturesDir}unauthorized-search.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "anything" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        error: "Authentication failed",
        message: "Malformed API key",
    });
});

Deno.test("keenable#v1/search: query required; whitespace rejected; bounds; mode accepted", async () => {
    const unit = await testSealedUnit("keenable#v1/search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-search-ok.json`);
    const rejected: Json[] = [
        {},
        { query: "" },
        { query: "   " },
        { query: "\t" },
        { query: "x", site: "   " },
        { query: "x", max_results: 0 },
        { query: "x", max_results: 51 },
        { query: "x", snippet_max_length: 179 },
        { query: "x", snippet_max_length: 10001 },
        { query: "x", published_after: "" },
        { query: "x", published_after: "   " },
        { query: "x", query_time: "" },
        { query: "x", query_time: "   " },
        { query: "x", query_time: 1790000000 },
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
    // passing near-twins of the bounds above; extra keys ride through
    // (looseObject). Replay matches method+URL, not body.
    const passing: Json[] = [
        { query: "x" },
        { query: "x", max_results: 1 },
        { query: "x", max_results: 50 },
        { query: "x", snippet_max_length: 180 },
        { query: "x", snippet_max_length: 10000 },
        { query: "x", bogus: 1 },
        { query: "x", mode: "pro" },
        { query: "x", mode: "realtime" },
        { query: "x", published_after: "2d" },
        { query: "x", published_after: "2w" },
        { query: "x", query_time: "1790000000" },
        { query: "x", query_time: "2026-01-01" },
        { query: "x", query_time: "2026-01-01T00:00:00Z" },
        { query: "x", query_time: "7d" },
        {
            query: "typescript best practices",
            site: "arxiv.org",
            published_after: "2026-01-01",
            max_results: 2,
        },
    ];
    for (const body of passing) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(ok.isProviderError, false, JSON.stringify(body));
    }
});

Deno.test({
    name: "keenable#v1/search live (gated on KEENABLE_API_KEY)",
    ignore: liveSkip("keenable"),
    fn: async () => {
        const unit = await testSealedUnit("keenable#v1/search");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    query: "deno 2 workspace monorepo guide",
                    max_results: 2,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence).sort(), ["RESULT"]);
        assertEquals(typeof result.usage.credits.default, "number");
        const output = result.output as Record<string, unknown>;
        assert(
            Array.isArray(output.results),
            "results array present",
        );
        assertEquals(output.query, "deno 2 workspace monorepo guide");
    },
});
