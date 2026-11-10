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
const ID = "fuse#prospects/filter-options";

const run = async (fixture: string, queryParams: Record<string, Json>) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { queryParams },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

const fieldOf = (output: Json, field: string) =>
    ((output as Record<string, Record<string, Record<string, unknown>>>)
        .filterOptions.fields[field]) as Record<string, unknown>;

Deno.test("fuse#prospects/filter-options: one filter's vocabulary, free", async () => {
    const result = await run("prospects-filter-options.json", {
        field: "job_title_levels",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const levels = fieldOf(result.output, "job_title_levels");
    assertEquals(levels.valueShape, "include_exclude");
    assertEquals((levels.values as unknown[]).length, 2);
});

Deno.test("fuse#prospects/filter-options: a free-text field loses the autocomplete pointer", async () => {
    const result = await run(
        "prospects-filter-options-free-text.json",
        { field: "job_title" },
    );
    const title = fieldOf(result.output, "job_title");
    assertEquals(title, { valueShape: "term", values: [] });
});

Deno.test("fuse#prospects/filter-options: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited-get.json", {});
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("fuse#prospects/filter-options: the gate rejects a misspelled field, and passes a listed one", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}prospects-filter-options.json`,
    );
    const refused: Record<string, Json>[] = [
        { field: "job_titles" },
        { feild: "industry" },
    ];
    for (const queryParams of refused) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertInputAccepted({
        unit,
        input: { queryParams: { field: "job_title_levels" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "fuse#prospects/filter-options live: one filter answers with its value shape",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { queryParams: { field: "job_title_levels" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assert(
            "valueShape" in fieldOf(result.output, "job_title_levels"),
        );
    },
});
