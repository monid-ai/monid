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
const ID = "outbound-dev#companies/search";
const FILTERS = { headquartersCountryCode: ["PRT"] };

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("outbound-dev#companies/search: a page of two companies bills two rows at $0.001", async () => {
    // The default page size (25) is asked for; two come back, two are billed.
    const result = await run("synthetic-companies-search.json", {
        query: "logistics companies in Portugal",
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
});

Deno.test("outbound-dev#companies/search: a balance that cannot cover the page is zero-billed data", async () => {
    const result = await run("synthetic-insufficient-balance.json", {
        filters: FILTERS,
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "insufficient_balance",
    );
});

Deno.test("outbound-dev#companies/search estimate: the page size, 25 by default", async () => {
    const unit = await testSealedUnit(ID);
    const byDefault = await estimateEndpoint(unit, {
        body: { filters: FILTERS },
    });
    assertEquals(byDefault.credits, { default: 0.025 });
    const one = await estimateEndpoint(unit, {
        body: { filters: FILTERS, limit: 1 },
    });
    assertEquals(one.credits, { default: 0.001 });
});

Deno.test("outbound-dev#companies/search: the gate rejects an unknown field and limit 101, and passes a query", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-companies-search.json`,
    );
    const refused: Json[] = [
        { filters: FILTERS, listId: "6a1f0c2b9d4e8a7f3c5b2e20" },
        { filters: FILTERS, limit: 101 },
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
        input: { body: { query: "logistics companies in Portugal" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "outbound-dev#companies/search live: one page of at most one company",
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
