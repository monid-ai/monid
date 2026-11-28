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
const ID = "outbound-dev#companies/count";
const FILTERS = { headquartersCountryCode: ["PRT"] };

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("outbound-dev#companies/count: a search counted recently answers at once, free", async () => {
    const result = await run("synthetic-count-ready.json", {
        filters: FILTERS,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        status: "ready",
        total: 812,
        filters: FILTERS,
    });
});

Deno.test("outbound-dev#companies/count: a new query count waits out its 202s", async () => {
    // The chain is shared with the people count: the lifecycle is the same.
    const result = await run("synthetic-count-pending.json", {
        query: "fast-growing logistics companies in Portugal",
    });
    assertEquals(result.httpStatus, 200);
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "ready");
    assertEquals(output.unresolvedCriteria, ["fast-growing"]);
});

Deno.test("outbound-dev#companies/count: a rate-limited repeat holds the run open", async () => {
    const result = await run("synthetic-count-poll-rate-limited.json", {
        filters: FILTERS,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals((result.output as Record<string, unknown>).status, "ready");
});

Deno.test("outbound-dev#companies/count: the gate takes exactly one of query or filters", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-count-ready.json`);
    const refused: Json[] = [
        {},
        { query: "logistics companies", filters: FILTERS },
        { savedSearchName: "Portugal logistics" },
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
        input: { body: { filters: FILTERS } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "outbound-dev#companies/count live: a count ends ready with a total",
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
