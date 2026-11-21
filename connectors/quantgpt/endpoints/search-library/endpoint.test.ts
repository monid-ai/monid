import { assertEquals, assertRejects } from "@std/assert";
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

const ID = "quantgpt#tools/search_library";
const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (synthetic): FREE, no credits drawn`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { query: "momentum", limit: 1 } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-search-library-ok.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals((output.result.matches as unknown[]).length, 1);
});

Deno.test(`${ID} estimate: free`, async () => {
    const promised = await estimateEndpoint(await testSealedUnit(ID), {
        body: { query: "post-earnings drift" },
    });
    assertEquals(promised, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: limit 1 to 50; unknown keys rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-library-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        { limit: 0 },
        { limit: 51 },
        { limit: 2.5 },
        { query: 5 },
        { q: "momentum" },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    for (
        const body of [
            {},
            { query: "turtle", category: "trend", limit: 50 },
        ] as Record<string, Json>[]
    ) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test({
    name: `${ID} live (gated on QUANTGPT_API_KEY, a partner key)`,
    ignore: liveSkip("quantgpt"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { query: "momentum", limit: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
