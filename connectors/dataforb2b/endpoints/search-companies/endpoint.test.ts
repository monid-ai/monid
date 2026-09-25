import { assertEquals } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "dataforb2b#search/companies";
const FILTERS = {
    op: "and",
    conditions: [
        { column: "industry", type: "=", value: "software development" },
        { column: "country_iso_code", type: "=", value: "FR" },
        { column: "employee_count", type: "in", value: ["51-200"] },
    ],
};

const search = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("dataforb2b#search/companies: the credits_used receipt bills and leaves the payload; the card agrees", async () => {
    const result = await search("search-companies.json", {
        filters: FILTERS,
        count: 2,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1.5 },
        evidence: { indexed_result: 2 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_used" in output, false);
    assertEquals((output.results as unknown[]).length, 2);
});

Deno.test("dataforb2b#search/companies: an empty search settles zero", async () => {
    const result = await search("search-empty.json", {
        filters: FILTERS,
        count: 25,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, {});
});

Deno.test("dataforb2b#search/companies: estimate is count × rate, indexed by default", async () => {
    const unit = await testSealedUnit(ID);
    const indexed = await estimateEndpoint(unit, {
        body: { filters: FILTERS, count: 10 },
    });
    assertEquals(indexed.credits, { default: 7.5 });
    const live = await estimateEndpoint(unit, {
        body: { filters: FILTERS, count: 10, enrich_live: true },
    });
    assertEquals(live.credits, { default: 15 });
});

Deno.test({
    name: "dataforb2b#search/companies live (gated on DATAFORB2B_API_KEY)",
    ignore: liveSkip("dataforb2b"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { filters: FILTERS, count: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
