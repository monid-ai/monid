import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "outbound-dev#people/count";
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

Deno.test("outbound-dev#people/count: a new query count waits out two 202s and keeps the first answer's echoes", async () => {
    const result = await run("synthetic-count-pending.json", {
        query: "fast-growing operations directors and VPs",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        status: "ready",
        total: 1246019,
        filters: FILTERS,
        // Only the first answer carried it: the repeats sent filters.
        unresolvedCriteria: ["fast-growing"],
    });
});

Deno.test("outbound-dev#people/count: a search counted recently answers at once", async () => {
    const result = await run("synthetic-count-ready.json", {
        filters: FILTERS,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals((result.output as Record<string, unknown>).status, "ready");
});

Deno.test("outbound-dev#people/count: a rate-limited repeat holds the run open", async () => {
    const result = await run("synthetic-count-poll-rate-limited.json", {
        filters: FILTERS,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals((result.output as Record<string, unknown>).total, 1246019);
});

Deno.test("outbound-dev#people/count: a refused first call ends the run as zero-billed data", async () => {
    const result = await run("synthetic-validation-failed.json", {
        filters: { job_title_levels: ["chief"] },
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "validation_failed",
    );
});

Deno.test("outbound-dev#people/count: the gate takes exactly one of query or filters", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-count-ready.json`);
    const refused: Json[] = [
        {},
        { query: "operations directors", filters: FILTERS },
        { filters: FILTERS, limit: 10 },
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
        input: { body: { query: "operations directors" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "outbound-dev#people/count live: a count ends ready with a total",
    ignore: liveSkip("outbound-dev"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { filters: FILTERS } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(output.status, "ready");
        assertEquals(typeof output.total, "number");
    },
});
