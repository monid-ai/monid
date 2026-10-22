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

const ID = "clawifi#scrape";
const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    body: { url: "https://example.com", formats: ["markdown"] },
};

Deno.test(`${ID} happy (synthetic): plain scrape, claim 1 == fold 1, receipt plucked`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-scrape-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { page: 1 },
    });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals("credits_charged" in output, false);
    assertEquals(typeof output.formats.markdown, "string");
    assertEquals(output.metadata.title, "Example Domain");
});

Deno.test(`${ID} cache hit (synthetic): Clawifi charges 0 and the fold derives 0 too`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-scrape-cache-hit.json`,
        ),
    });
    assertEquals(result.usage, { credits: {}, evidence: { page: 0 } });
});

Deno.test(`${ID}: the estimate promises the browser for mode 'browser' or a screenshot format`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(await estimateEndpoint(unit, INPUT), {
        credits: { default: 1 },
        evidence: { page: 1 },
    });
    const browser = {
        credits: { default: 3 },
        evidence: { page: 1, browser_render: 1 },
    };
    assertEquals(
        await estimateEndpoint(unit, {
            body: { url: "https://example.com", mode: "browser" },
        }),
        browser,
    );
    assertEquals(
        await estimateEndpoint(unit, {
            body: {
                url: "https://example.com",
                formats: ["metadata", { type: "screenshot", quality: 60 }],
            },
        }),
        browser,
    );
});

Deno.test(`${ID}: schema gate mirrors the vendor validators`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-scrape-ok.json`);
    const rejected: Json[] = [
        {},
        { url: "not-a-url" },
        { url: "https://example.com", formats: ["pdf"] },
        { url: "https://example.com", formats: [{ type: "markdown", x: 1 }] },
        {
            url: "https://example.com",
            formats: [{ type: "links", max_items: 0 }],
        },
        {
            url: "https://example.com",
            formats: [{ type: "links", max_items: 201 }],
        },
        {
            url: "https://example.com",
            formats: [{ type: "text", max_chars: 200001 }],
        },
        {
            url: "https://example.com",
            formats: [{ type: "screenshot", quality: 29 }],
        },
        {
            url: "https://example.com",
            formats: [{ type: "images", max_bytes: 1023 }],
        },
        { url: "https://example.com", mode: "headless" },
        { url: "https://example.com", artifact_policy: "inline" },
        { url: "https://example.com", top_k: 21 },
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
        {
            url: "https://example.com/pricing",
            formats: [
                "metadata",
                { type: "links", max_items: 25 },
                { type: "markdown", mode: "reader", max_chars: 200000 },
                {
                    type: "json",
                    schema: {
                        title: { type: "string" },
                        price: { type: "string" },
                    },
                },
            ],
        },
        {
            url: "https://example.com",
            formats: ["text"],
            query: "pricing",
            top_k: 3,
        },
        {
            url: "https://example.com",
            mode: "http",
            artifact_policy: "metadata_only",
        },
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
                    formats: ["markdown", "metadata"],
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.mismatch, undefined);
        const output = result.output as Record<string, Record<string, unknown>>;
        assertEquals("credits_charged" in output, false);
        assertEquals(typeof output.formats.markdown, "string");
    },
});
