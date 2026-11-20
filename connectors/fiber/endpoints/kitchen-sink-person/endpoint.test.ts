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
const ID = "fiber#kitchen-sink/person";
const fixture = (name: string) =>
    loadFixture(`${fixturesDir}synthetic-${name}.json`);

Deno.test(`${ID} without liveFetch: one person draws one lookup only`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                personName: { value: "Bill Gates" },
                companyDomain: { value: "gatesfoundation.org" },
            },
        },
        mode: "replay",
        fixture: await fixture("happy"),
    });
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { lookup: 1, live_fetch: 0 },
    });
});

Deno.test(`${ID} no match: 200 with nothing found draws nothing`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { emailAddress: "nobody@example.com" } },
        mode: "replay",
        fixture: await fixture("miss"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { lookup: 0, live_fetch: 0 },
    });
});

Deno.test(`${ID} opted out (410): provider error, zero usage, message relayed`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                profileIdentifier: {
                    identifier: "linkedinSlug",
                    value: "opted-out-person",
                },
            },
        },
        mode: "replay",
        fixture: await fixture("opted-out"),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(typeof output.message, "string");
    assert((output.message as string).length > 0);
});

Deno.test(`${ID} estimate: defaults hold one lookup, no live fetch`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: { personName: { value: "Bill Gates" } },
    });
    assertEquals(usage, {
        credits: { default: 2 },
        evidence: { lookup: 1, live_fetch: 0 },
    });
});

Deno.test(`${ID} estimate: liveFetch doubles each held person`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: {
            personName: { value: "Bill Gates" },
            numProfiles: 3,
            liveFetch: true,
        },
    });
    assertEquals(usage, {
        credits: { default: 12 },
        evidence: { lookup: 3, live_fetch: 3 },
    });
});

Deno.test(`${ID} input gate: an unknown profile identifier kind is rejected before the wire`, async () => {
    await assertRejects(
        async () =>
            await runEndpoint({
                unit: await testSealedUnit(ID),
                input: {
                    body: {
                        profileIdentifier: {
                            identifier: "twitter",
                            value: "BillGates",
                        },
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
            input: {
                body: {
                    profileIdentifier: {
                        identifier: "linkedinSlug",
                        value: "williamhgates",
                    },
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});
