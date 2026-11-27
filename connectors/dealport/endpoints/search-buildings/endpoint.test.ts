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

const ID = "dealport#api/v1/buildings";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    queryParams: {
        borough: "MN",
        min_units: 20,
        limit: 2,
    },
};

Deno.test(`${ID} happy (synthetic): two new NYC building Records bill $0.02`, async () => {
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
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { RESULT: 2 },
    });

    const output = result.output as Record<string, Json>;
    assertEquals("credits_charged" in output, false);
    assertEquals((output.data as unknown[]).length, 2);
});

Deno.test(`${ID} empty (synthetic): zero building matches bill $0.00`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                borough: "SI",
                q: "zzzz_nonexistent_building",
                limit: 2,
            },
        },
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

Deno.test(`${ID} provider error (synthetic 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: borough is required and enums/bounds are validated`, async () => {
    const unit = await testSealedUnit(ID);
    const badInputs: Record<string, Json>[] = [
        {},
        { borough: "NYC" },
        { borough: "MN", loan_holder: "private_credit" },
        { borough: "MN", limit: 51 },
    ];
    for (const bad of badInputs) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams: bad },
                    mode: "replay",
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    assertEquals(
        await estimateEndpoint(unit, {
            queryParams: { borough: "MN", loan_holder: "cmbs", limit: 50 },
        }),
        { credits: { default: 0.5 }, evidence: { RESULT: 50 } },
    );
    assertEquals(
        await estimateEndpoint(unit, { queryParams: { borough: "BK" } }),
        { credits: { default: 0.25 }, evidence: { RESULT: 25 } },
    );
});

Deno.test({
    name: `${ID} live (gated on DEALPORT_API_KEY)`,
    ignore: liveSkip("dealport"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    borough: "SI",
                    q: "zzzzzz_nonexistent_building_99999",
                    limit: 1,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
        const output = result.output as Record<string, Json>;
        assertEquals(Array.isArray(output.data), true);
        assertEquals("credits_charged" in output, false);
    },
});
