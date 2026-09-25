import { assertEquals, assertRejects } from "@std/assert";
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
const ID = "dataforb2b#search/people";
const FILTERS = {
    op: "and",
    conditions: [
        { column: "current_title", type: "like", value: "software engineer" },
        { column: "profile_country", type: "=", value: "US" },
    ],
};

const search = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("dataforb2b#search/people: the credits_used receipt bills and leaves the payload; the card agrees", async () => {
    const result = await search("search-people.json", {
        filters: FILTERS,
        count: 2,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { live_result: 2 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_used" in output, false);
    assertEquals(output.total, 10000);
    assertEquals((output.results as unknown[]).length, 2);
});

Deno.test("dataforb2b#search/people: an empty search settles zero", async () => {
    const result = await search("search-empty.json", {
        filters: FILTERS,
        count: 25,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, {});
    assertEquals((result.output as Record<string, unknown>).total, 0);
});

Deno.test("dataforb2b#search/people: 402 is data, zero usage", async () => {
    const result = await search("insufficient-credits.json", {
        filters: FILTERS,
        count: 25,
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("dataforb2b#search/people: estimate is count × the live or indexed rate, live by default", async () => {
    const unit = await testSealedUnit(ID);
    const live = await estimateEndpoint(unit, {
        body: { filters: FILTERS, count: 10 },
    });
    assertEquals(live.credits, { default: 15 });
    const indexed = await estimateEndpoint(unit, {
        body: { filters: FILTERS, count: 10, enrich_live: false },
    });
    assertEquals(indexed.credits, { default: 7.5 });
});

Deno.test("dataforb2b#search/people: count is required and bounded; filter grammar is enforced", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}search-people.json`);
    const rejected: Json[] = [
        { filters: FILTERS },
        { filters: FILTERS, count: 0 },
        { filters: FILTERS, count: 1001 },
        { filters: { op: "xor", conditions: FILTERS.conditions }, count: 1 },
        {
            filters: {
                op: "and",
                conditions: [{ column: "skill", type: "~", value: "Go" }],
            },
            count: 1,
        },
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
    // a nested or-group passes
    const nested = await runEndpoint({
        unit,
        input: {
            body: {
                filters: {
                    op: "and",
                    conditions: [
                        { column: "profile_country", type: "=", value: "US" },
                        {
                            op: "or",
                            conditions: [
                                { column: "skill", type: "=", value: "Go" },
                                { column: "skill", type: "=", value: "Rust" },
                            ],
                        },
                    ],
                },
                count: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(nested.isProviderError, false);
});

Deno.test({
    name: "dataforb2b#search/people live (gated on DATAFORB2B_API_KEY)",
    ignore: liveSkip("dataforb2b"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { filters: FILTERS, count: 1, enrich_live: false } },
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
