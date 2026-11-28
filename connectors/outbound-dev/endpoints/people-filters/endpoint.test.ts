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
const ID = "outbound-dev#people/filters";

const run = async (fixture: string, queryParams: Record<string, Json>) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { queryParams },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

const fieldOf = (output: Json, field: string) =>
    (output as Record<string, Record<string, Record<string, unknown>>>)
        .fields[field];

Deno.test("outbound-dev#people/filters: one filter's values, free", async () => {
    const result = await run("synthetic-people-filters.json", {
        field: "job_title_levels",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const levels = fieldOf(result.output, "job_title_levels");
    assertEquals(levels.valueShape, "include_exclude");
    assertEquals((levels.values as unknown[]).length, 2);
});

Deno.test("outbound-dev#people/filters: a free-text filter keeps its suggestions query", async () => {
    // The pointer names a route this connector carries as
    // outbound-dev#people/autocomplete, so it passes through.
    const result = await run("synthetic-people-filters-free-text.json", {
        field: "job_title",
    });
    assertEquals(fieldOf(result.output, "job_title"), {
        valueShape: "term",
        values: [],
        autocomplete: "/v1/people/autocomplete?field=title",
    });
});

Deno.test("outbound-dev#people/filters: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited-get.json", {});
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("outbound-dev#people/filters: the gate rejects a misspelled key, and passes a field", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-people-filters.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { feild: "job_title_levels" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { queryParams: { field: "job_title_levels" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "outbound-dev#people/filters live: one filter answers with its values",
    ignore: liveSkip("outbound-dev"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { queryParams: { field: "job_title_levels" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        const levels = fieldOf(result.output, "job_title_levels");
        assertEquals(Array.isArray(levels.values), true);
    },
});
