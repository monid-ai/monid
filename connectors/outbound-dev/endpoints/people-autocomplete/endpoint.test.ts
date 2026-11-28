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
const ID = "outbound-dev#people/autocomplete";

const run = async (fixture: string, queryParams: Record<string, Json>) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { queryParams },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("outbound-dev#people/autocomplete: job title suggestions, free", async () => {
    const result = await run("synthetic-people-autocomplete.json", {
        field: "title",
        q: "head",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        field: "title",
        suggestions: [
            { name: "head of operations" },
            { name: "head of business operations" },
        ],
    });
});

Deno.test("outbound-dev#people/autocomplete: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited-suggestions.json", {
        field: "company",
        q: "hald",
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("outbound-dev#people/autocomplete: the gate rejects an unknown field and a missing q", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-people-autocomplete.json`,
    );
    const refused: Record<string, Json>[] = [
        { field: "seniority", q: "head" },
        { field: "title" },
        { q: "head" },
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
        input: { queryParams: { field: "title", q: "head" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "outbound-dev#people/autocomplete live: suggestions come back as a list",
    ignore: liveSkip("outbound-dev"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { queryParams: { field: "title", q: "head of sales" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(Array.isArray(output.suggestions), true);
    },
});
