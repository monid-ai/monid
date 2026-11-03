import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("keenable#v1/fetch-answer happy (synthetic): prompt required; one credit", async () => {
    const unit = await testSealedUnit("keenable#v1/fetch-answer");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-answer.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                url: "https://example.com",
                prompt: "list every pricing tier",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    assertEquals(
        (result.output as Record<string, unknown>).content,
        "No pricing tiers on this page.",
    );
});

Deno.test("keenable#v1/fetch-answer: prompt required; whitespace rejected", async () => {
    const unit = await testSealedUnit("keenable#v1/fetch-answer");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-answer.json`,
    );
    const rejected: Record<string, Json>[] = [
        { url: "https://example.com" },
        { url: "https://example.com", prompt: "" },
        { url: "https://example.com", prompt: "   " },
        { prompt: "list every pricing tier" },
    ];
    for (const queryParams of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(queryParams),
        );
    }
});
