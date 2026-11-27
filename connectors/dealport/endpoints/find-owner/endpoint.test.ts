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

const ID = "dealport#api/v1/owners";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const COMPANY_ID = "11111111-2222-4333-8444-555555555551";

Deno.test(`${ID} happy (synthetic): verified owner hit bills $0.09 and strips receipts`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { company_id: COMPANY_ID } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.09 },
        evidence: { RESULT: 1 },
    });

    const output = result.output as Record<string, Json>;
    assertEquals("cost_usd" in output, false);
    assertEquals("credits_charged" in output, false);
    assertEquals("remaining_balance_usd" in output, false);
    assertEquals(output.email, "jordan.blake@buckeyeclimate-example.com");
});

Deno.test(`${ID} miss (synthetic): unverified or missing owner settles at $0.00`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-miss.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { company_id: "11111111-2222-4333-8444-555555555552" },
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

Deno.test(`${ID} provider error (synthetic 403): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { company_id: COMPANY_ID } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: requires UUID company_id and rejects unknown fields`, async () => {
    const unit = await testSealedUnit(ID);
    const badInputs: Record<string, Json>[] = [
        {},
        { company_id: "not-a-uuid" },
        { company_id: COMPANY_ID, person: "" },
        { company_id: COMPANY_ID, extra: true },
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
            body: { company_id: COMPANY_ID, person: null },
        }),
        { credits: { default: 0.09 }, evidence: { RESULT: 1 } },
    );
    assertEquals(
        await estimateEndpoint(unit, {
            body: { company_id: COMPANY_ID, person: "Jordan Blake" },
        }),
        { credits: { default: 0.09 }, evidence: { RESULT: 1 } },
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
                body: {
                    company_id: "00000000-0000-4000-8000-000000000000",
                },
            },
            mode: "live",
        });
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
