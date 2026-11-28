import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "outbound-dev#people/search";
const FILTERS = {
    job_title_levels: ["director", "vp"],
    job_title_role: ["operations"],
};

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("outbound-dev#people/search: a page of two people bills two rows at $0.001", async () => {
    // The default page size (10) is asked for; two come back, two are billed.
    const result = await run("synthetic-people-search.json", {
        filters: FILTERS,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.002 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals((output.data as unknown[]).length, 2);
    assertEquals(output.filters, FILTERS);
    assertEquals(
        (output.pagination as Record<string, unknown>).nextCursor,
        "cGVvcGxlXzI",
    );
});

Deno.test("outbound-dev#people/search: an empty page settles ZERO", async () => {
    const result = await run("synthetic-people-search-empty.json", {
        query: "operations directors at logistics companies in Portugal",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test("outbound-dev#people/search: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-validation-failed.json", {
        filters: FILTERS,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "validation_failed");
    assertEquals(output.param, "filters");
});

Deno.test("outbound-dev#people/search: a 429 carries no envelope and is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited.json", {
        filters: FILTERS,
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "outbound.dev API error",
    );
});

Deno.test("outbound-dev#people/search estimate: the page size, 10 by default", async () => {
    const unit = await testSealedUnit(ID);
    const byDefault = await estimateEndpoint(unit, {
        body: { filters: FILTERS },
    });
    assertEquals(byDefault.credits, { default: 0.01 });
    const full = await estimateEndpoint(unit, {
        body: { filters: FILTERS, limit: 100 },
    });
    assertEquals(full.credits, { default: 0.1 });
});

Deno.test("outbound-dev#people/search: the gate rejects a saved search and limit 101, and passes limit 100", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-people-search.json`);
    const refused: Json[] = [
        { savedSearchId: "6a1f0c2b9d4e8a7f3c5b2e10" },
        { filters: FILTERS, limit: 101 },
        { filters: FILTERS, limit: 0 },
    ];
    for (const body of refused) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertInputAccepted({
        unit,
        input: { body: { filters: FILTERS, limit: 100 } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "outbound-dev#people/search live: one page of at most one person",
    ignore: liveSkip("outbound-dev"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { filters: FILTERS, limit: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        const output = result.output as Record<string, unknown>;
        assert(Array.isArray(output.data));
        assert((output.data as unknown[]).length <= 1);
    },
});
