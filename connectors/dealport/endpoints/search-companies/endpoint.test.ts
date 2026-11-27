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

const ID = "dealport#api/v1/companies";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    queryParams: {
        state: "OH",
        naics: "238220",
        limit: 2,
    },
};

Deno.test(`${ID} happy (synthetic): two new Records bill $0.02 and strip receipt`, async () => {
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
    assertEquals(output.next_cursor, "2");
});

Deno.test(`${ID} empty (synthetic): zero matches bill $0.00`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                state: "OH",
                q: "zzzz_nonexistent_company",
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

Deno.test(`${ID} provider error (synthetic 422): zero usage`, async () => {
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
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate and default limit estimate: rejects bad filters and defaults limit=25`, async () => {
    const unit = await testSealedUnit(ID);
    const badInputs: Record<string, Json>[] = [
        { state: "O" },
        { limit: 0 },
        { limit: 51 },
        { preview: true },
        { unknown_param: "x" },
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
        await estimateEndpoint(unit, { queryParams: { state: "OH" } }),
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
                    state: "OH",
                    q: "zzzzzz_nonexistent_company_99999",
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
