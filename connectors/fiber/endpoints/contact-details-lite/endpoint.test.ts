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
const ID = "fiber#contact-details/lite";
const fixture = (name: string) =>
    loadFixture(`${fixturesDir}synthetic-${name}.json`);
/** What the caller sees: Fiber's body minus the `chargeInfo` receipt. */
const delivered = (f: Fixture) => ({
    output: (f.calls[0].res.body as { output: Json }).output,
});

Deno.test(`${ID} default enrichmentType: one work email draws one email credit`, async () => {
    const happy = await fixture("work-email");
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                input: {
                    mode: "linkedin",
                    linkedinIdentifier: "williamhgates",
                },
            },
        },
        mode: "replay",
        fixture: happy,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { email: 1, phone: 0 },
    });
    // the one work email reaches the caller; the receipt does not
    assertEquals(result.output, delivered(happy));
});

Deno.test(`${ID} nothing found: 200 with nothing found draws nothing`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                input: {
                    mode: "name-domain",
                    fullName: "Jane Placeholder",
                    companyDomain: "example.com",
                },
            },
        },
        mode: "replay",
        fixture: await fixture("miss"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { email: 0, phone: 0 },
    });
});

Deno.test(`${ID} out of credits (402): provider error, zero usage, message relayed`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                input: {
                    mode: "linkedin",
                    linkedinIdentifier: "williamhgates",
                },
            },
        },
        mode: "replay",
        fixture: await fixture("provider-error"),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(typeof output.message, "string");
    assert((output.message as string).length > 0);
});

Deno.test(`${ID} estimate: defaults hold one work-email charge`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: {
            input: { mode: "linkedin", linkedinIdentifier: "williamhgates" },
        },
    });
    assertEquals(usage, {
        credits: { default: 1 },
        evidence: { email: 1, phone: 0 },
    });
});

Deno.test(`${ID} estimate: every type requested holds 2 emails + 1 phone`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: {
            input: { mode: "linkedin", linkedinIdentifier: "williamhgates" },
            enrichmentType: {
                getWorkEmails: true,
                getPersonalEmails: true,
                getPhoneNumbers: true,
            },
        },
    });
    assertEquals(usage, {
        credits: { default: 4 },
        evidence: { email: 2, phone: 1 },
    });
});

Deno.test(`${ID} estimate: phone only holds no email charge`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: {
            input: { mode: "linkedin", linkedinIdentifier: "williamhgates" },
            enrichmentType: { getWorkEmails: false, getPhoneNumbers: true },
        },
    });
    assertEquals(usage, {
        credits: { default: 2 },
        evidence: { email: 0, phone: 1 },
    });
});

Deno.test(`${ID} input gate: name-domain without a domain is rejected before the wire`, async () => {
    await assertRejects(
        async () =>
            await runEndpoint({
                unit: await testSealedUnit(ID),
                input: {
                    body: {
                        input: {
                            mode: "name-domain",
                            fullName: "Jane Placeholder",
                        },
                    },
                },
                mode: "replay",
                fixture: await fixture("work-email"),
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test(`${ID} input gate twin: Fiber's null fullName and patience pass`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: {
            input: {
                mode: "linkedin",
                linkedinIdentifier: "williamhgates",
                fullName: null,
            },
            patience: null,
        },
    });
    assertEquals(usage, {
        credits: { default: 1 },
        evidence: { email: 1, phone: 0 },
    });
});

Deno.test({
    name: `${ID} live (gated on FIBER_API_KEY)`,
    ignore: liveSkip("fiber"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    input: {
                        mode: "linkedin",
                        linkedinIdentifier: "williamhgates",
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
        // shape, not amounts: either list may be empty on a miss
        const profile = (result.output as {
            output?: { profile?: Record<string, unknown> };
        }).output?.profile;
        assert(profile, JSON.stringify(result.output));
        assert(Array.isArray(profile.emails));
        assert(Array.isArray(profile.phoneNumbers));
    },
});

Deno.test(`${ID} claim wins: a per-org price below the card settles at the receipt`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                input: {
                    mode: "linkedin",
                    linkedinIdentifier: "williamhgates",
                },
                enrichmentType: {
                    getWorkEmails: true,
                    getPersonalEmails: true,
                    getPhoneNumbers: true,
                },
            },
        },
        mode: "replay",
        fixture: await fixture("claim-mismatch"),
    });
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { email: 2, phone: 1 },
        mismatch: { derived: { default: 4 } },
    });
});
