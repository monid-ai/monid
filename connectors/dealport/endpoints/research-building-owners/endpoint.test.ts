import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "dealport#api/v1/buildings/owners";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const BBLS = ["1008350041", "1008400012"];

Deno.test(`${ID} happy (synthetic): confirmed 202 research bills $0.05 per distinct owner`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { bbls: BBLS, confirm_max_usd: 0.1 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 202);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.1 },
        evidence: { RESULT: 2 },
    });

    const output = result.output as Record<string, Json>;
    assertEquals("cost_usd" in output, false);
    assertEquals("remaining_balance_usd" in output, false);
    assertEquals((output.data as Record<string, Json>).distinct_owners, 2);
});

Deno.test(`${ID} quote (synthetic): omitting confirm_max_usd estimates and settles at $0.00`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(await estimateEndpoint(unit, { body: { bbls: BBLS } }), {
        credits: {},
        evidence: { RESULT: 0 },
    });
    const fixture = await loadFixture(`${fixturesDir}synthetic-quote.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { bbls: BBLS } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
});

Deno.test(`${ID} provider error (synthetic 403): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { bbls: ["1008350041"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: validates 10-digit NYC BBLs and confirm_max_usd`, async () => {
    const unit = await testSealedUnit(ID);
    const badInputs: Record<string, Json>[] = [
        {},
        { bbls: [] },
        { bbls: ["6008350041"] },
        { bbls: ["100835004"] },
        { bbls: ["1008350041"], confirm_max_usd: -0.05 },
    ];
    for (const bad of badInputs) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: bad },
                    mode: "replay",
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    assertEquals(
        await estimateEndpoint(unit, {
            body: { bbls: ["5008350041"], confirm_max_usd: 0 },
        }),
        { credits: {}, evidence: { RESULT: 0 } },
    );
    assertEquals(
        await estimateEndpoint(unit, {
            body: { bbls: ["1008350041", "1008350041"], confirm_max_usd: 0.5 },
        }),
        { credits: { default: 0.05 }, evidence: { RESULT: 1 } },
    );
});

Deno.test({
    name: `${ID} live quote (gated on DEALPORT_API_KEY)`,
    ignore: liveSkip("dealport"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { bbls: ["1008350041"] } },
            mode: "live",
        });
        if (result.isProviderError) {
            assertEquals(result.usage, { credits: {}, evidence: {} });
        } else {
            assertEquals(result.usage, {
                credits: {},
                evidence: { RESULT: 0 },
            });
        }
    },
});
