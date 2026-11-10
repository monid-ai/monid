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
const ID = "fuse#companies/filter-options";

const run = async (fixture: string, queryParams: Record<string, Json>) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { queryParams },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#companies/filter-options: one filter answers free, without the autocomplete pointer", async () => {
    const result = await run("companies-filter-options.json", {
        field: "investors",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        filterOptions: {
            fields: {
                investors: { valueShape: "include_exclude", values: [] },
            },
        },
    });
});

Deno.test("fuse#companies/filter-options: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited-get.json", {});
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("fuse#companies/filter-options: the gate rejects a people field, and passes a company one", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}companies-filter-options.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { field: "job_title_levels" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { queryParams: { field: "investors" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "fuse#companies/filter-options live: every list comes back without a field",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {},
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const options = (result.output as Record<string, unknown>)
            .filterOptions as Record<string, unknown>;
        assert(Array.isArray(options.fundingStages));
    },
});
