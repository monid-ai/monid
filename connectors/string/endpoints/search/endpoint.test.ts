import { assertAlmostEquals, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("string#search happy: no searchCount, evidence settles at one page", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(
        `${fixturesDir}search-heat-pump-grants.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { query: "heat pump grants" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // no paging.pages on the response (request omitted searchCount) ⇒
    // evidence falls back to the documented single-page default.
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { search: 1, ai_overview: 0 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals((output.results as unknown[]).length, 2);
    assertEquals((output.peopleAlsoAsk as unknown[]).length, 2);
});

Deno.test("string#search happy: a searchCount search settles at the pages that answered", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-paged.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { query: "best running shoes", searchCount: 30 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.evidence, { search: 3, ai_overview: 0 });
    assertAlmostEquals(result.usage.credits.default, 0.003, 1e-9);
});

Deno.test("string#search happy: aiOverview bills one search more", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(
        `${fixturesDir}search-heat-pump-grants.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { query: "heat pump grants", aiOverview: true } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.002 },
        evidence: { search: 1, ai_overview: 1 },
    });
});

Deno.test("string#search happy: a raw HTML page settles at one page", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-raw.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { query: "heat pump grants", format: "raw" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(typeof result.output, "string");
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { search: 1, ai_overview: 0 },
    });
});

Deno.test("string#search happy: an AI Mode answer settles at one search", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-ai-mode.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "how does a heat pump work",
                engine: "google_ai_mode",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { search: 1, ai_overview: 0 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(
        typeof (output.aiMode as Record<string, unknown>).text,
        "string",
    );
});

Deno.test("string#search: a search that comes back with nothing settles at zero", async () => {
    const unit = await testSealedUnit("string#search");
    // recorded: no results and nothing else on the page, though
    // zeroResults is false and String billed the search
    const noMatch = await runEndpoint({
        unit,
        input: {
            body: {
                query: '"qzxvplorktanu fnarglewibbet 88127"',
                autocorrect: false,
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}search-no-match.json`),
    });
    assertEquals(noMatch.isProviderError, false);
    assertEquals(noMatch.usage, {
        credits: {},
        evidence: { search: 0, ai_overview: 0 },
    });
    // Google's own no-match flag wins over any other field, and over
    // the aiOverview line
    const zero = await runEndpoint({
        unit,
        input: { body: { query: "heat pump grnts", aiOverview: true } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-search-zero-results.json`,
        ),
    });
    assertEquals(zero.isProviderError, false);
    assertEquals(zero.usage, {
        credits: {},
        evidence: { search: 0, ai_overview: 0 },
    });
});

Deno.test("string#search provider error (synthetic 401): zero usage", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { query: "heat pump grants" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("string#search: the schema gate holds each documented bound and rejects unknown fields", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(
        `${fixturesDir}search-heat-pump-grants.json`,
    );
    const rejected: Json[] = [
        { searchCount: 10 },
        { query: "" },
        { query: "shoes", searchCount: 301 },
        { query: "shoes", searchCount: 0 },
        { query: "shoes", page: 31 },
        { query: "shoes", engine: "brave" },
        { query: "shoes", engine: "bing" },
        { query: "shoes", country: "USA" },
        { query: "shoes", language: "english" },
        { query: "shoes", location: "" },
        { query: "shoes", location: "x".repeat(201) },
        { query: "shoes", coordinates: { latitude: 91, longitude: 0 } },
        { query: "shoes", coordinates: { latitude: 0, longitude: 0, z: 1 } },
        { query: "shoes", dateRange: "decade" },
        { query: "shoes", dateRange: { from: "2026/01/01" } },
        { query: "shoes", searchType: "news" },
        { query: "shoes", region: "us" },
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
    // near-valid twins, each at its documented bound, clear the gate
    const accepted: Json[] = [
        { query: "shoes", searchCount: 300 },
        { query: "shoes", page: 30 },
        { query: "shoes", engine: "google_ai_mode", country: "gb" },
        { query: "shoes", language: "pt-br", location: "x".repeat(200) },
        {
            query: "shoes",
            coordinates: { latitude: 90, longitude: -180, radius: 1_000_000 },
        },
        { query: "shoes", dateRange: "year", sortBy: "date" },
        { query: "shoes", dateRange: { from: "2026-01-01" } },
        { query: "shoes", searchType: "images", safeSearch: true },
        { query: "shoes", restrictCountry: "FR", verbatim: true },
    ];
    for (const body of accepted) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test("string#search: engine defaults to google and offers only google and AI Mode", async () => {
    const unit = await testSealedUnit("string#search");
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        { default?: unknown; enum?: unknown }
    >;
    assertEquals(properties.engine.default, "google");
    assertEquals(properties.engine.enum, ["google", "google_ai_mode"]);
});

const estimateFor = async (body: RunInput["body"]) =>
    estimateEndpoint(await testSealedUnit("string#search"), { body });

Deno.test("string#search: the estimate holds one page, or the 36-page cap when google pages", async () => {
    assertEquals(await estimateFor({ query: "shoes" }), {
        credits: { default: 0.001 },
        evidence: { search: 1, ai_overview: 0 },
    });
    // 36 × 0.001 is not exact in floating point
    const hold = await estimateFor({ query: "shoes", searchCount: 5 });
    assertEquals(hold.evidence, { search: 36, ai_overview: 0 });
    assertAlmostEquals(hold.credits.default, 0.036, 1e-9);
    assertEquals(
        await estimateFor({ query: "shoes", engine: "google_ai_mode" }),
        {
            credits: { default: 0.001 },
            evidence: { search: 1, ai_overview: 0 },
        },
    );
    assertEquals(
        await estimateFor({ query: "shoes", aiOverview: true }),
        {
            credits: { default: 0.002 },
            evidence: { search: 1, ai_overview: 1 },
        },
    );
});

Deno.test({
    name: "string#search live (gated on STRING_API_KEY)",
    ignore: liveSkip("string"),
    fn: async () => {
        const unit = await testSealedUnit("string#search");
        const result = await runEndpoint({
            unit,
            input: { body: { query: "deno 2 workspace monorepo guide" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // live convention: shape, not amounts (PR review) — real traffic
        // can settle a different page count than replay's pinned 1
        assertEquals(Object.keys(result.usage.evidence).sort(), [
            "ai_overview",
            "search",
        ]);
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
