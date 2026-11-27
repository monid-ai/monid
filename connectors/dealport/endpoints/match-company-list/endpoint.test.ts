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

const ID = "dealport#api/v1/companies/match";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: {
        items: [
            {
                external_id: "crm-101",
                name: "Buckeye Climate Systems LLC",
                domain: "buckeyeclimate-example.com",
                state: "OH",
            },
        ],
    },
};

Deno.test(`${ID} happy (synthetic): free match strips both top-level and nested receipts`, async () => {
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
    const data = output.data as Record<string, Json>;
    assertEquals("cost_usd" in output, false);
    assertEquals("credits_charged" in output, false);
    assertEquals("remaining_balance_usd" in output, false);
    assertEquals("cost_usd" in data, false);
    assertEquals("credits_charged" in data, false);
    assertEquals("remaining_balance_usd" in data, false);
    assertEquals(data.matched_count, 1);
    assertEquals((data.results as unknown[]).length, 1);
});

Deno.test(`${ID} provider error (synthetic 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { items: [{ name: "Buckeye Climate Systems LLC" }] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: requires items or csv and rejects watch mutations`, async () => {
    const unit = await testSealedUnit(ID);
    const badInputs: Record<string, Json>[] = [
        {},
        { items: [] },
        { csv: "" },
        { items: [{ name: "Acme" }], watch: true },
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
            body: { items: [{ name: "Acme" }] },
        }),
        { credits: {}, evidence: {} },
    );
    assertEquals(
        await estimateEndpoint(unit, {
            body: { csv: "name,domain\nAcme Corp,acme-example.com" },
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
            input: {
                body: {
                    items: [{
                        name: "Synthetic Nonexistent Match Co",
                        domain: "synthetic-nonexistent-match.invalid",
                    }],
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, Json>;
        assertEquals("cost_usd" in output, false);
        assertEquals(
            typeof (output.data as Record<string, Json>).total_input,
            "number",
        );
    },
});
