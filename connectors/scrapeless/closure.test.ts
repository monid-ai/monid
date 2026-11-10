import { assert, assertEquals, assertRejects } from "@std/assert";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import type { Json } from "@shared/core";
const cases = [
    ["amazon/product", "amazon-product"],
    ["amazon/seller", "amazon-seller"],
    ["amazon/keywords", "amazon-keywords"],
    ["amazon/rufus", "amazon-rufus"],
    ["tiktok/user/detail", "tiktok-user-detail"],
    ["ai/alexa", "ai-alexa"],
] as const;

Deno.test("Rufus optional flags: published boolean/string schema survives compilation", async () => {
    const unit = await testSealedUnit("scrapeless#amazon/rufus");
    const result = await estimateEndpoint(unit, {
        body: {
            input: {
                type: "rufus",
                keywords: "example",
                domain: "www.amazon.com",
                is_sse_data: false,
                is_get_question: true,
                asin: "B0BQXHK363",
            },
        },
    });
    assertEquals(result.credits, { default: 0.003 });
});
Deno.test("Rufus flags reject string booleans before any supplier call", async () => {
    const unit = await testSealedUnit("scrapeless#amazon/rufus");
    await assertRejects(() =>
        estimateEndpoint(unit, {
            body: {
                input: {
                    type: "rufus",
                    keywords: "example",
                    domain: "www.amazon.com",
                    is_sse_data: "true",
                },
            },
        })
    );
});
for (const [id, file] of cases) {
    Deno.test(`closure ${id}: real result through registered artifact and original-price model`, async () => {
        const unit = await testSealedUnit("scrapeless#" + id);
        const fixture = await loadFixture(
            new URL(`./fixtures/recorded-closure-${file}.json`, import.meta.url)
                .pathname,
        );
        const result = await runEndpoint({
            unit,
            input: { body: fixture.calls[0].req.body! },
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, false);
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage, {
            credits: { default: 0.003 },
            evidence: { CALL: 1 },
        });
        const output = result.output as Record<string, Json>;
        assertEquals(output.provider_response, fixture.calls.at(-1)!.res.body);
    });
    Deno.test(`closure ${id}: input/schema errors rejected before any paid request`, async () => {
        const unit = await testSealedUnit("scrapeless#" + id);
        let invalid = false;
        try {
            await runEndpoint({
                unit,
                input: { body: { input: {} } },
                mode: "replay",
            });
        } catch (error) {
            invalid = String(error).includes("INVALID_INPUT");
        }
        assert(invalid);
    });
}
Deno.test("URL-only AI Mode: real execution failure is preserved and zero-settled, not retried", async () => {
    const unit = await testSealedUnit("scrapeless#ai/aimode");
    const fixture = await loadFixture(
        new URL(
            "./fixtures/recorded-closure-ai-aimode-url.json",
            import.meta.url,
        ).pathname,
    );
    const result = await runEndpoint({
        unit,
        input: { body: fixture.calls[0].req.body! },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});
