import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    type Fixture,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import type { Json } from "@shared/core";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "fiber#kitchen-sink/company";
const fixture = (name: string) =>
    loadFixture(`${fixturesDir}synthetic-${name}.json`);
/** What the caller sees: Fiber's body minus the `chargeInfo` receipt. */
const delivered = (f: Fixture) => ({
    output: (f.calls[0].res.body as { output: Json }).output,
});

Deno.test(`${ID} happy: two companies draw two lookups, receipt stripped`, async () => {
    const happy = await fixture("happy");
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { companyName: { value: "Stripe" }, numCompanies: 3 } },
        mode: "replay",
        fixture: happy,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 4 },
        evidence: { RESULT: 2 },
    });
    // both companies reach the caller; the receipt does not
    assertEquals(result.output, delivered(happy));
});

Deno.test(`${ID} rate limited (429): provider error, zero usage, message relayed`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { companyName: { value: "Stripe" } } },
        mode: "replay",
        fixture: await fixture("provider-error"),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(typeof output.message, "string");
    assert((output.message as string).length > 0);
});

Deno.test(`${ID} no match: 200 with nothing found draws nothing`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: { companyDomain: { value: "no-such-company.example" } },
        },
        mode: "replay",
        fixture: await fixture("miss"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID} estimate: numCompanies defaults to 1`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: { companyName: { value: "Stripe" } },
    });
    assertEquals(usage, { credits: { default: 2 }, evidence: { RESULT: 1 } });
});

Deno.test(`${ID} estimate: numCompanies caps the hold`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: { companyName: { value: "Stripe" }, numCompanies: 3 },
    });
    assertEquals(usage, { credits: { default: 6 }, evidence: { RESULT: 3 } });
});

Deno.test(`${ID} input gate: numCompanies above 10 is rejected before the wire`, async () => {
    await assertRejects(
        async () =>
            await runEndpoint({
                unit: await testSealedUnit(ID),
                input: {
                    body: {
                        companyName: { value: "Stripe" },
                        numCompanies: 11,
                    },
                },
                mode: "replay",
                fixture: await fixture("happy"),
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test(`${ID} input gate twin: Fiber's null companyDomain passes`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: { companyName: { value: "Stripe" }, companyDomain: null },
    });
    assertEquals(usage, { credits: { default: 2 }, evidence: { RESULT: 1 } });
});

Deno.test({
    name: `${ID} live (gated on FIBER_API_KEY)`,
    ignore: liveSkip("fiber"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { companyDomain: { value: "stripe.com" } } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts
        const data = (result.output as { output?: { data?: unknown } })
            .output?.data;
        assert(Array.isArray(data), JSON.stringify(result.output));
        for (const company of data as Record<string, unknown>[]) {
            assertEquals(typeof company.name, "string");
            assert(Array.isArray(company.domains));
        }
    },
});
