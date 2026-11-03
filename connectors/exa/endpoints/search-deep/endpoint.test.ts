import { assertAlmostEquals, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "exa#search/deep";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy: structured output with grounding, $0.012 claim equals the fold`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.id, ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "Which three EU countries had the highest solar " +
                    "capacity additions in 2025, and by how much?",
                numResults: 3,
                outputSchema: {
                    type: "object",
                    properties: {
                        countries: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    country: { type: "string" },
                                    gigawatts: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // recorded live 2026-11-02: no `type` ⇒ the binding's "deep" ⇒ the
    // deep_search cell; exa's costDollars.total ($0.012) agrees
    assertEquals(result.usage, {
        credits: { default: 0.012 },
        evidence: { deep_search: 1 },
    });
    const output = result.output as {
        costDollars?: unknown;
        output: { content: unknown; grounding: unknown[] };
    };
    assertEquals(output.costDollars, undefined);
    assertEquals(typeof output.output.content, "object");
    assertEquals(output.output.grounding.length > 0, true);
});

Deno.test(`${ID} provider error: 401 is data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "anything" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: only the deep search types are accepted`, async () => {
    const unit = await testSealedUnit(ID);
    for (const type of ["auto", "lite", "fast"]) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: { query: "q", type } },
                    mode: "replay",
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    // the passing near-twin
    await assertInputAccepted({
        unit,
        input: { body: { query: "q", type: "deep-reasoning" } },
        mode: "replay",
    });
});

Deno.test(`${ID} estimate: the base price follows \`type\``, async () => {
    const unit = await testSealedUnit(ID);
    const cases: Array<[string | undefined, string, number]> = [
        [undefined, "deep_search", 0.012], // binding default "deep"
        ["deep-lite", "deep_search", 0.012],
        ["deep", "deep_search", 0.012],
        ["deep-reasoning", "deep_reasoning_search", 0.015],
    ];
    for (const [type, cell, dollars] of cases) {
        const usage = await estimateEndpoint(unit, {
            body: { query: "q", ...(type ? { type } : {}) },
        });
        assertEquals(usage.evidence, { [cell]: 1 }, String(type));
        assertAlmostEquals(usage.credits.default, dollars, 1e-9, String(type));
    }
});

Deno.test({
    name: `${ID} live (gated on EXA_API_KEY)`,
    ignore: liveSkip("exa"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    query: "latest developments in LLMs",
                    type: "deep-reasoning",
                    numResults: 3,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { deep_reasoning_search: 1 });
        assertAlmostEquals(result.usage.credits.default, 0.015, 1e-9);
        assertEquals(result.usage.mismatch, undefined);
    },
});
