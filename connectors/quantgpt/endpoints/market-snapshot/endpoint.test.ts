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

const ID = "quantgpt#tools/market_snapshot";
const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (synthetic): flat US$0.02, envelope and disclaimer kept`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: {} },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-market-snapshot-ok.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.tool, "market_snapshot");
    assertEquals(typeof output.disclaimer, "string");
    const body = output.result as Record<string, unknown>;
    assertEquals(Array.isArray(body.indexes), true);
});

Deno.test(`${ID} estimate: one flat call`, async () => {
    const promised = await estimateEndpoint(await testSealedUnit(ID), {
        body: { blocks: ["all"] },
    });
    assertEquals(promised, {
        credits: { default: 0.02 },
        evidence: { CALL: 1 },
    });
});

Deno.test(`${ID} key revoked or API off (synthetic 404): data, zero usage`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: {} },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-not-found.json`),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as { message: string }).message, "not found");
});

Deno.test(`${ID} schema gate: enums, the 25-symbol cap and unknown keys`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-market-snapshot-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        { blocks: ["everything"] },
        { symbols: Array.from({ length: 26 }, (_, i) => `S${i}`) },
        { detail: "verbose" },
        { symbol: ["MSFT"] },
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
            {
                blocks: ["all", "symbols"],
                symbols: ["MSFT", "$SPX", "BTC"],
                detail: "full",
            },
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
            input: { body: {} },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
        const output = result.output as Record<string, unknown>;
        assertEquals(typeof output.disclaimer, "string");
    },
});
