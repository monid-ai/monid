import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "exa#search/lite";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} identity: a public path of its own over the shared /search wire path`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.id, ID);
    // `type` is pinned by the binding, so it is not caller-facing
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    assert(!("type" in properties), "type must not be in the lite schema");
    for (const rejected of ["outputSchema", "systemPrompt", "stream"]) {
        assert(
            !(rejected in properties),
            `${rejected} is rejected by lite and must not be advertised`,
        );
    }
});

Deno.test(`${ID} happy: $0.004 claim equals the fold, receipt consolidated away`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "latest developments in LLMs",
                numResults: 3,
                contents: { highlights: true },
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // recorded live 2026-11-02: exa's costDollars.total ($0.004) and the
    // pinned fold (flat call, nothing above 10) agree — no mismatch rides
    assertEquals(result.usage, {
        credits: { default: 0.004 },
        evidence: { call: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("costDollars" in output, false);
    assertEquals((output.results as unknown[]).length, 2);
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

Deno.test(`${ID} estimate: $0.004 base plus $0.001 per result above 10`, async () => {
    const unit = await testSealedUnit(ID);
    const base = await estimateEndpoint(unit, { body: { query: "q" } });
    assertEquals(base.evidence, { call: 1 });
    assertAlmostEquals(base.credits.default, 0.004, 1e-9);

    const twelve = await estimateEndpoint(unit, {
        body: { query: "q", numResults: 12 },
    });
    assertEquals(twelve.evidence, { call: 1, additional_result: 2 });
    assertAlmostEquals(twelve.credits.default, 0.006, 1e-9);
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
                    query: "deno 2 workspace monorepo guide",
                    numResults: 2,
                    // a caller-supplied type is overwritten, never forwarded:
                    // were "deep" sent, the vendor would bill $0.012
                    type: "deep",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { call: 1 });
        // the vendor's claim is the lite price, so the pin reached the wire
        assertAlmostEquals(result.usage.credits.default, 0.004, 1e-9);
        assertEquals(result.usage.mismatch, undefined);
    },
});
