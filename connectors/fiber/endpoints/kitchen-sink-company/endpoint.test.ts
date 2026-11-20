import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "fiber#kitchen-sink/company";
const fixture = (name: string) =>
    loadFixture(`${fixturesDir}synthetic-${name}.json`);

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
    },
});
