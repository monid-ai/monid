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
const ID = "fuse#companies/search";
const QUERY = "Series B fintech companies in New York with 50 to 200 employees";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#companies/search: a page bills the rows it returned, without `isSaved`", async () => {
    // A short page: the default size is asked and two rows come back, so only
    // the rows returned may be billed.
    const result = await run("companies-search.json", {
        query: QUERY,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as Record<string, unknown>;
    const companies = output.companies as Record<string, unknown>[];
    assertEquals(companies.length, 2);
    assertEquals(companies.some((company) => "isSaved" in company), false);
    assertEquals(output.nextCursor, "c_recorded_page_2");
    assertEquals(output.total, 50);
});

Deno.test("fuse#companies/search: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited.json", { query: QUERY });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("fuse#companies/search estimate: the page size, 25 unless asked", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        (await estimateEndpoint(unit, { body: { query: QUERY } })).credits,
        { default: 25 },
    );
    assertEquals(
        (await estimateEndpoint(unit, { body: { query: QUERY, size: 5 } }))
            .credits,
        { default: 5 },
    );
});

Deno.test("fuse#companies/search: the gate rejects two sources and a saved search, and passes filters alone", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}companies-search.json`,
    );
    const filters = { domains: ["northwind-payments.example"] };
    const refused: Json[] = [
        { filters, query: QUERY },
        { savedSearchName: "Fintech in New York" },
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
        input: { body: { filters } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "fuse#companies/search live: a one-row page settles at most one result",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { query: QUERY, size: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assert(Array.isArray(output.companies));
        assert((output.companies as unknown[]).length <= 1);
    },
});
