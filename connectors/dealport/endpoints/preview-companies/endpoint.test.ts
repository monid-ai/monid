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

const ID = "dealport#api/v1/companies/preview";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: {
        state: "OH",
        naics: ["238220"],
        independent: true,
    },
};

Deno.test(`${ID} happy (synthetic): free market sizing bills nothing and strips receipts`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });

    const output = result.output as Record<string, Json>;
    assertEquals("cost_usd" in output, false);
    assertEquals("credits_charged" in output, false);
    assertEquals("remaining_balance_usd" in output, false);
    assertEquals(output.matching_count, 3842);
    assertEquals((output.sample as unknown[]).length, 2);
});

Deno.test(`${ID} provider error (synthetic 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { state: "OH" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: invalid state, bounds, and unknown keys fail INVALID_INPUT`, async () => {
    const unit = await testSealedUnit(ID);
    const badInputs: Record<string, Json>[] = [
        { state: "OHIO" },
        { limit: 51 },
        { owner_businesses: 1 },
        { unknown_filter: true },
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
            body: {
                state: "OH",
                limit: 50,
                owner_businesses: null,
                min_revenue: null,
            },
        }),
        { credits: {}, evidence: {} },
    );
});

Deno.test({
    name: `${ID} live (gated on DEALPORT_API_KEY)`,
    ignore: liveSkip("dealport"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, Json>;
        assertEquals(typeof output.matching_count, "number");
        assertEquals(Array.isArray(output.sample), true);
        assertEquals("cost_usd" in output, false);
    },
});
