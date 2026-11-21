import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "clawifi#map";
const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (synthetic): 10 URLs = one started block of 10 = 1 credit, equal to the claim`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { url: "https://example.com", max_urls: 10 } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-map-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 10 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_charged" in output, false);
    assertEquals((output.urls as unknown[]).length, 10);
    assertEquals(output.discovered_count, 10);
});

/** One run against an inline body: the fold for URL counts the fixtures
 *  do not cover (0, 11), with the vendor's own claim beside it. */
const settle = async (urls: number, claimed: number) => {
    const body = {
        success: true,
        url: "https://example.com/",
        urls: Array.from({ length: urls }, (_, i) => ({
            url: `https://example.com/p${i}`,
            source: "sitemap",
            reason: "listed in https://example.com/sitemap.xml",
            score: 0.9,
        })),
        discovered_count: urls,
        errors: [],
        credits_charged: claimed,
    };
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () =>
                Promise.resolve(
                    new Response(JSON.stringify(body), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    }),
                ),
        }),
    }).load(await testSealedUnit(ID));
    return (await loaded.run({ body: { url: "https://example.com" } })).usage;
};

Deno.test(`${ID}: the vendor floor (at least 1) and started blocks of 10 are in the fold`, async () => {
    assertEquals(await settle(0, 1), {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    assertEquals(await settle(11, 2), {
        credits: { default: 2 },
        evidence: { RESULT: 11 },
    });
});

Deno.test(`${ID}: the estimate holds max_urls, vendor default 100 materialized`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, { body: { url: "https://example.com" } }),
        { credits: { default: 10 }, evidence: { RESULT: 100 } },
    );
    assertEquals(
        await estimateEndpoint(unit, {
            body: { url: "https://example.com", max_urls: 25 },
        }),
        { credits: { default: 3 }, evidence: { RESULT: 25 } },
    );
});

Deno.test(`${ID}: schema gate mirrors the vendor validators`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-map-ok.json`);
    const rejected: Json[] = [
        {},
        { url: "not-a-url" },
        { url: "https://example.com", max_urls: 0 },
        { url: "https://example.com", max_urls: 1001 },
        { url: "https://example.com", sources: [] },
        { url: "https://example.com", sources: ["atom"] },
        { url: "https://example.com", robots_policy: "skip" },
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
        { url: "https://example.com", max_urls: 1 },
        { url: "https://example.com", max_urls: 1000 },
        {
            url: "https://example.com",
            sources: ["robots", "sitemap", "html_links", "rss", "docs_paths"],
            same_domain_only: true,
            allow_subdomains: false,
            robots_policy: "respect",
            search: "docs",
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
            input: { body: { url: "https://example.com", max_urls: 10 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.credits, { default: 1 });
        assertEquals(result.usage.mismatch, undefined);
        assertEquals(
            "credits_charged" in (result.output as Record<string, unknown>),
            false,
        );
    },
});
