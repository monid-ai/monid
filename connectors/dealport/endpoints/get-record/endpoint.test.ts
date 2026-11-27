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

const ID = "dealport#api/v1/records/{id}";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const COMPANY_ID = "11111111-2222-4333-8444-555555555551";

Deno.test(`${ID} happy (synthetic): new Record bills $0.01 and strips receipts`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: COMPANY_ID } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { RESULT: 1 },
    });

    const output = result.output as Record<string, Json>;
    assertEquals("cost_usd" in output, false);
    assertEquals("credits_charged" in output, false);
    assertEquals("remaining_balance_usd" in output, false);
    assertEquals((output.data as Record<string, Json>).id, COMPANY_ID);
});

Deno.test(`${ID} repeat read (synthetic): 30-day workspace repeat bills $0.00`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-repeat.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "1008350041" } },
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

Deno.test(`${ID} provider error (synthetic 404): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { id: "99999999-9999-4999-8999-999999999999" },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: accepts company UUID or NYC BBL and rejects malformed ids`, async () => {
    const unit = await testSealedUnit(ID);
    const badInputs: Record<string, string>[] = [
        {},
        { id: "" },
        { id: "not-a-uuid-or-bbl" },
        { id: "0008350041" },
        { id: COMPANY_ID, extra: "x" },
    ];
    for (const bad of badInputs) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { pathParams: bad },
                    mode: "replay",
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    assertEquals(
        await estimateEndpoint(unit, { pathParams: { id: "1008350041" } }),
        { credits: { default: 0.01 }, evidence: { RESULT: 1 } },
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
                pathParams: { id: "00000000-0000-4000-8000-000000000000" },
            },
            mode: "live",
        });
        assertEquals(result.httpStatus, 404);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
