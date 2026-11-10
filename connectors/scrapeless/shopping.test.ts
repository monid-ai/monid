import { assert, assertEquals } from "@std/assert";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const engines = ["chatgpt", "gemini", "aimode", "overview"] as const;
for (const engine of engines) {
    const base = engine === "chatgpt" ? 0.002 : 0.0018;
    Deno.test(`shopping ${engine}: recorded products/empty branch through formal artifact`, async () => {
        const unit = await testSealedUnit(`scrapeless#ai/${engine}`);
        const fixture = await loadFixture(
            new URL(
                `./fixtures/recorded-shopping-${engine}.json`,
                import.meta.url,
            ).pathname,
        );
        const input = { body: fixture.calls[0].req.body! };
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage.credits, {
            default: base * (engine === "gemini" ? 1 : 2),
        });
        assertEquals((await estimateEndpoint(unit, input)).credits, {
            default: base * 2,
        });
        // The answer and native product/reference payload survive metering.
        assertEquals(
            (result.output as Record<string, Json>).provider_response,
            fixture.calls.at(-1)!.res.body,
        );
    });
    for (const shopping of [true, false, undefined]) {
        for (
            const products of [undefined, null, [], [{
                title: "Synthetic",
                stores: [{ name: "Example" }],
            }, { title: "Second product" }]] as (Json | undefined)[]
        ) {
            const name = products === undefined
                ? "absent"
                : products === null
                ? "null"
                : (products as Json[]).length === 0
                ? "empty"
                : "multiple";
            Deno.test(`shopping ${engine}: synthetic flag=${shopping}, products=${name}`, async () => {
                const unit = await testSealedUnit(`scrapeless#ai/${engine}`);
                const original = await loadFixture(
                    new URL(
                        `./fixtures/recorded-shopping-${engine}.json`,
                        import.meta.url,
                    ).pathname,
                );
                const fixture = structuredClone(original);
                fixture.name = "synthetic-shopping-branch";
                fixture.description =
                    "Synthetic boundary scenario, not live fee confirmation.";
                const request = fixture.calls[0].req.body as {
                    input: Record<string, Json>;
                };
                if (shopping === undefined) delete request.input.shopping;
                else request.input.shopping = shopping;
                const response = fixture.calls.at(-1)!.res.body as {
                    task_result: Record<string, Json>;
                };
                if (products === undefined) {
                    delete response.task_result.products;
                } else response.task_result.products = products;
                const input = { body: fixture.calls[0].req.body! };
                const result = await runEndpoint({
                    unit,
                    input,
                    mode: "replay",
                    fixture,
                });
                const enabled = shopping === true ||
                    (shopping === undefined && engine !== "gemini");
                const extra = name === "multiple" &&
                    (engine === "chatgpt" || enabled);
                assertEquals(result.usage.credits, {
                    default: base * (extra ? 2 : 1),
                });
                // ChatGPT can return billable products even with shopping=false.
                const estimate = await estimateEndpoint(unit, input);
                assertEquals(estimate.credits, {
                    default: base * (engine === "chatgpt" || enabled ? 2 : 1),
                });
                assert(
                    result.usage.credits.default <= estimate.credits.default,
                    "The admission estimate must cover successful settlement.",
                );
            });
        }
    }
}

for (const actor of [undefined, "scraper.chatgpt"] as const) {
    Deno.test(`shopping chatgpt: shopping=false reserves enrichment with actor=${actor}`, async () => {
        const unit = await testSealedUnit("scrapeless#ai/chatgpt");
        const estimate = await estimateEndpoint(unit, {
            body: {
                ...(actor === undefined ? {} : { actor }),
                input: {
                    prompt: "Synthetic product request",
                    country: "US",
                    shopping: false,
                },
            },
        });
        assertEquals(estimate.credits, { default: 0.004 });
        assertEquals(estimate.evidence, { base: 1, shopping_enrichment: 1 });
    });
}

Deno.test("AI Mode URL-only input is restored; estimate reserves enrichment ceiling", async () => {
    const unit = await testSealedUnit("scrapeless#ai/aimode");
    const estimated = await estimateEndpoint(unit, {
        body: {
            input: {
                url: "https://www.google.com/search?q=usb+c+cable&udm=50",
            },
        },
    });
    assertEquals(estimated.credits, { default: 0.0036 });
});
