import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

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
        credits: { default: 0.001 },
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

Deno.test("keenable#v1/fetch-answer provider error (recorded 401): data, zero usage", async () => {
    const unit = await testSealedUnit("keenable#v1/fetch-answer");
    const fixture = await loadFixture(
        `${fixturesDir}unauthorized-fetch-answer.json`,
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
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        error: "Authentication failed",
        message: "Malformed API key",
    });
});

Deno.test({
    name: "keenable#v1/fetch-answer live (gated on KEENABLE_API_KEY)",
    ignore: liveSkip("keenable"),
    fn: async () => {
        const unit = await testSealedUnit("keenable#v1/fetch-answer");
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    url: "https://example.com",
                    prompt: "what is this page for",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence).sort(), ["CALL"]);
        const output = result.output as Record<string, unknown>;
        assertEquals(typeof output.content, "string");
    },
});
