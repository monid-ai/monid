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

const ID = "quantgpt#tools/grade_stock";
const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (synthetic, fictional ticker): flat US$0.03`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { ticker: "SYNTH" } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-grade-stock-ok.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.03 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals(output.result.ticker, "SYNTH");
    assertEquals(typeof output.disclaimer, "string");
});

Deno.test(`${ID} estimate: one flat call`, async () => {
    const promised = await estimateEndpoint(await testSealedUnit(ID), {
        body: { ticker: "SYNTH", charts: true },
    });
    assertEquals(promised, {
        credits: { default: 0.03 },
        evidence: { CALL: 1 },
    });
});

Deno.test(`${ID} unknown ticker (synthetic 400): the tool's refusal is free`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { ticker: "NOSUCH" } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-grade-stock-refused.json`,
        ),
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { message: string }).message,
        "unknown ticker: NOSUCH",
    );
});

Deno.test(`${ID} key revoked or API off (synthetic 404): data, zero usage`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { ticker: "SYNTH" } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-not-found.json`),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: ticker required and non-blank; unknown keys rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-grade-stock-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        {},
        { ticker: "" },
        { ticker: "   " },
        { ticker: "SYNTH", charts: "yes" },
        { ticker: "SYNTH", symbol: "SYNTH" },
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
            { ticker: "SYNTH" },
            { ticker: "BRK.B", charts: false },
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
            input: { body: { ticker: "MSFT" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
    },
});
