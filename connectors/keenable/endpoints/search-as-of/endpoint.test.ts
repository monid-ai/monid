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

Deno.test("keenable#v1/search-as-of happy (synthetic): query_time required; one credit", async () => {
    const unit = await testSealedUnit("keenable#v1/search-as-of");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-as-of.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "typescript best practices",
                query_time: "2026-01-01",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals((output.results as unknown[]).length, 1);
    assertEquals("usage" in output, false);
    assertEquals("credits" in output, false);
    assertEquals("costDollars" in output, false);
});

Deno.test("keenable#v1/search-as-of: query_time required", async () => {
    const unit = await testSealedUnit("keenable#v1/search-as-of");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-as-of.json`,
    );
    const rejected: Json[] = [
        { query: "typescript best practices" },
        { query: "typescript best practices", query_time: "" },
        { query: "typescript best practices", query_time: "   " },
        { query_time: "2026-01-01" },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
});

Deno.test("keenable#v1/search-as-of provider error (recorded 401): data, zero usage", async () => {
    const unit = await testSealedUnit("keenable#v1/search-as-of");
    const fixture = await loadFixture(`${fixturesDir}unauthorized-search.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "typescript best practices",
                query_time: "2026-01-01",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "keenable#v1/search-as-of live (gated on KEENABLE_API_KEY)",
    ignore: liveSkip("keenable"),
    fn: async () => {
        const unit = await testSealedUnit("keenable#v1/search-as-of");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    query: "typescript best practices",
                    query_time: "2026-01-01",
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
        const output = result.output as Record<string, unknown>;
        assertEquals(Array.isArray(output.results), true);
    },
});
