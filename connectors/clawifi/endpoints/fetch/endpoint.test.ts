import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "clawifi#fetch";
const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = { body: { url: "https://example.com" } };

const run = async (fixtureName: string, body: Json = INPUT.body) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: body as Record<string, Json> },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}${fixtureName}.json`),
    });

Deno.test(`${ID} happy (synthetic): plain fetch, claim 1 == fold 1, receipt plucked`, async () => {
    const result = await run("synthetic-fetch-ok");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { page: 1 },
    });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals("credits_charged" in output, false);
    assertEquals(output.data.title, "Example Domain");
    assertEquals(typeof output.data.content_markdown, "string");
});

Deno.test(`${ID} cache hit (synthetic): Clawifi charges 0 and the fold derives 0 too`, async () => {
    const result = await run("synthetic-fetch-cache-hit");
    assertEquals(result.httpStatus, 200);
    // the zero claim is pruned by the engine; the fold must not fall back
    // to a flat 1, so nothing is billed
    assertEquals(result.usage, { credits: {}, evidence: { page: 0 } });
    assertEquals(
        "credits_charged" in (result.output as Record<string, unknown>),
        false,
    );
});

Deno.test(`${ID} browser render (synthetic): 1 + 2 = 3, equal to the claim`, async () => {
    const result = await run("synthetic-fetch-browser");
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { page: 1, browser_render: 1 },
    });
});

Deno.test(`${ID} PDF (synthetic): 64 pages read = 2 started blocks of 50 x 2 = 4, in place of the base`, async () => {
    const result = await run("synthetic-fetch-pdf", {
        url: "https://example.com/report.pdf",
        max_pages: 100,
    });
    assertEquals(result.usage, {
        credits: { default: 4 },
        evidence: { page: 0, pdf_page: 64 },
    });
});

Deno.test(`${ID}: the estimate promises the browser only when force_browser asks for it`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(await estimateEndpoint(unit, INPUT), {
        credits: { default: 1 },
        evidence: { page: 1 },
    });
    assertEquals(
        await estimateEndpoint(unit, {
            body: { url: "https://example.com", force_browser: true },
        }),
        {
            credits: { default: 3 },
            evidence: { page: 1, browser_render: 1 },
        },
    );
});

Deno.test(`${ID}: schema gate mirrors the vendor validators`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-fetch-ok.json`);
    const rejected: Json[] = [
        {},
        { url: "not-a-url" },
        { url: "https://example.com", top_k: 0 },
        { url: "https://example.com", top_k: 21 },
        { url: "https://example.com", max_pages: 0 },
        { url: "https://example.com", max_pages: 501 },
        { url: "https://example.com", query: "x".repeat(501) },
        { url: "https://example.com", timeout_seconds: 0 },
        { url: "https://example.com", wait_until: "idle" },
        { url: "https://example.com", browser_profile: "headed" },
        { url: "https://example.com", exclude_tags: Array(21).fill("nav") },
        { url: "https://example.com", source: "bing" },
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
    const passing: Json[] = [
        { url: "https://example.com" },
        { url: "http://example.com" },
        { url: "https://example.com", top_k: 1, query: "x".repeat(500) },
        { url: "https://example.com", top_k: 20 },
        { url: "https://example.com", max_pages: 1 },
        { url: "https://example.com", max_pages: 500 },
        { url: "https://example.com", timeout_seconds: 1 },
        { url: "https://example.com", wait_until: "networkidle" },
        { url: "https://example.com", browser_profile: "lite" },
        { url: "https://example.com", exclude_tags: Array(20).fill("nav") },
        { url: "https://arxiv.org/abs/1706.03762", source: "arxiv" },
    ];
    for (const body of passing) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test({
    name: `${ID} live (gated on CLAWIFI_API_KEY)`,
    ignore: liveSkip("clawifi"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    url: "https://example.com",
                    query: "what is this domain for",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // a live fetch may be served from the cache (0) or not (1): either
        // way the claim and the fold agree
        assertEquals(result.usage.mismatch, undefined);
        const output = result.output as Record<string, Record<string, unknown>>;
        assertEquals("credits_charged" in output, false);
        assertEquals(typeof output.data.content_markdown, "string");
    },
});
