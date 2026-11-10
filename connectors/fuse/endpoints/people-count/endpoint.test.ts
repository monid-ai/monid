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
const ID = "fuse#data/people/count";
const FILTERS = {
    job_title_levels: [{ status: "include", value: "vp" }],
    job_title_role: [{ status: "include", value: "sales" }],
    location_country: [{ status: "include", value: "united states" }],
};
const QUERY = "VPs of sales in the United States who joined in the last year";
/** The filters Fuse built from QUERY when the chains were recorded (2026-10-29). */
const RECORDED_FILTERS = {
    keywords: ["vice president of sales", "vp of sales", "vp sales"],
    job_title_role: [{ status: "include", value: "sales" }],
    location_country: [{ status: "include", value: "united states" }],
    job_start_date: 12,
};

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#data/people/count: a count Fuse already holds answers on the first call, free", async () => {
    const result = await run("people-count-ready.json", {
        filters: RECORDED_FILTERS,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        status: "ready",
        total: 11090,
        filters: RECORDED_FILTERS,
    });
});

Deno.test("fuse#data/people/count: a new count is repeated with its filters until ready, keeping the query's echoes", async () => {
    // Two 202s, then 200: the repeats send the returned `filters`, whose
    // answers carry no `unresolvedCriteria` — the first answer's survive.
    const result = await run("people-count-pending.json", {
        query: QUERY,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        status: "ready",
        total: 11090,
        filters: RECORDED_FILTERS,
        unresolvedCriteria: [],
        closestCompanyMatches: [],
    });
});

Deno.test("fuse#data/people/count: a refused repeat holds the run open while the count runs", async () => {
    const result = await run("synthetic-people-count-poll-rate-limited.json", {
        filters: FILTERS,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals((result.output as Record<string, unknown>).total, 18432);
});

Deno.test("fuse#data/people/count: a count that failed ends the run as zero-billed data", async () => {
    const result = await run("synthetic-people-count-failed.json", {
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

Deno.test("fuse#data/people/count: a refused start is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited.json", { query: QUERY });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("fuse#data/people/count: the gate rejects both sources at once, and passes one", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}people-count-ready.json`,
    );
    const refused: Json[] = [{ filters: FILTERS, query: QUERY }, {}];
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
        input: { body: { filters: FILTERS } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "fuse#data/people/count live: a sentence counts to a total",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { query: "VPs of sales at fintech companies" } },
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
