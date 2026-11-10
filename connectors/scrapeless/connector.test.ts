import { assertEquals } from "@std/assert";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const cases = [
    ["google/search", "recorded-2026-10-22-google", 0.001],
    ["google/images", "recorded-expansion-google-images", 0.001],
    ["google/local", "recorded-expansion-google-local", 0.001],
    ["google/videos", "recorded-expansion-google-videos", 0.001],
    ["google/shopping", "recorded-expansion-google-shopping", 0.001],
    ["google/news", "recorded-expansion-google-news", 0.001],
    ["ai/perplexity", "recorded-expansion-ai-perplexity", 0.0018],
    ["ai/grok", "recorded-options-grok-auto", 0.0018],
    ["ai/chatgpt", "recorded-2026-10-22-ai", 0.002],
    ["ai/gemini", "recorded-expansion-ai-gemini", 0.0018],
    ["ai/aimode", "recorded-expansion-ai-aimode", 0.0018],
    ["ai/overview", "recorded-expansion-ai-overview", 0.0018],
    ["web-unlocker", "recorded-2026-10-22-unlocker", 0.001],
] as const;

for (const [path, file, usd] of cases) {
    Deno.test(`scrapeless formal ${path}: recorded success, one charge per run`, async () => {
        const unit = await testSealedUnit(`scrapeless#${path}`);
        const fixture = await loadFixture(
            new URL(`./fixtures/${file}.json`, import.meta.url).pathname,
        );
        const result = await runEndpoint({
            unit,
            input: { body: fixture.calls[0].req.body! },
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, false);
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage.credits, { default: usd });
        assertEquals(
            result.usage
                .evidence[
                    path === "ai/chatgpt" || path === "ai/gemini" ||
                        path === "ai/aimode" || path === "ai/overview"
                        ? "base"
                        : "CALL"
                ],
            1,
        );
        assertEquals(unit.doc.usage.consolidate, undefined);
    });
    Deno.test(`scrapeless formal ${path}: authentication failure settles at zero`, async () => {
        const unit = await testSealedUnit(`scrapeless#${path}`);
        const original = await loadFixture(
            new URL(`./fixtures/${file}.json`, import.meta.url).pathname,
        );
        const first = original.calls[0];
        const result = await runEndpoint({
            unit,
            input: { body: first.req.body! },
            mode: "replay",
            fixture: {
                name: "synthetic-auth-error",
                description:
                    "Synthetic authentication failure, not a live vendor response.",
                calls: [{
                    req: first.req,
                    res: { status: 401, body: { error: "Invalid API key" } },
                }],
            },
        });
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
}
