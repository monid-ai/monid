import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

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
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
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
