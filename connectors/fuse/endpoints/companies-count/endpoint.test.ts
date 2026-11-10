import { assert, assertEquals, assertRejects } from "@std/assert";
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
const ID = "fuse#data/companies/count";
const FILTERS = {
    crunchbaseCategoryGroups: ["Financial Services"],
    stage: [{ label: "Series B", value: "series_b", status: "include" }],
    headquartersCity: ["New York, New York, United States"],
    employeeCountV2: { min: 50, max: 200 },
};
const QUERY = "Series B fintech companies in New York with 50 to 200 employees";
/** The filters Fuse built from QUERY when the chains were recorded (2026-10-29). */
const RECORDED_FILTERS = {
    crunchbaseCategories: [
        { status: "include", value: "FinTech", label: "FinTech" },
    ],
    headquartersStateName: [
        { status: "include", value: "New York", label: "New York" },
    ],
    stage: [{ status: "include", value: "series_b", label: "series_b" }],
    employeeCountV2: { min: 50, max: 200 },
};

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#data/companies/count: a count Fuse already holds answers on the first call, free", async () => {
    const result = await run("companies-count.json", {
        filters: RECORDED_FILTERS,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        status: "ready",
        total: 45,
        filters: RECORDED_FILTERS,
    });
});

Deno.test("fuse#data/companies/count: a new count is repeated with its filters until ready, keeping the query's unresolved criteria", async () => {
    // A 202, then 200: the repeat sends the returned `filters`, whose answer
    // carries no `unresolvedCriteria`; the first answer's survives.
    const result = await run("companies-count-pending.json", {
        query: QUERY,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        status: "ready",
        total: 45,
        filters: RECORDED_FILTERS,
        unresolvedCriteria: [],
    });
});

Deno.test("fuse#data/companies/count: a refused repeat holds the run open while the count runs", async () => {
    const result = await run(
        "synthetic-companies-count-poll-rate-limited.json",
        { filters: FILTERS },
    );
    assertEquals(result.httpStatus, 200);
    assertEquals((result.output as Record<string, unknown>).total, 1287);
});

Deno.test("fuse#data/companies/count: a count that failed ends the run as zero-billed data", async () => {
    const result = await run("synthetic-companies-count-failed.json", {
        filters: FILTERS,
    });
    assertEquals(result.httpStatus, 503);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "UNEXPECTED_ERROR",
    );
});

Deno.test("fuse#data/companies/count: a refused start is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited.json", { query: QUERY });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("fuse#data/companies/count: the gate rejects no source and an unknown filter, and passes filters", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}companies-count.json`,
    );
    const refused: Json[] = [{}, { filters: { headquarters: ["New York"] } }];
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
        input: {
            body: {
                filters: {
                    headquartersCity: ["New York, New York, United States"],
                },
            },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "fuse#data/companies/count live: a sentence counts to a total",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { query: "fintech companies in New York" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(output.status, "ready");
        assert(typeof output.total === "number");
    },
});
