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
const ID = "fiber#linkedin-live-fetch/profile/single";
const fixture = (name: string) =>
    loadFixture(`${fixturesDir}synthetic-${name}.json`);
/** What the caller sees: Fiber's body minus the `chargeInfo` receipt. */
const delivered = (f: Fixture) => ({
    output: (f.calls[0].res.body as { output: Json }).output,
});

Deno.test(`${ID} happy: one fetch draws one call, receipt and balance stripped`, async () => {
    const happy = await fixture("happy");
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { identifier: "williamhgates" } },
        mode: "replay",
        fixture: happy,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { CALL: 1 },
    });
    // chargeInfo.lowCreditAlert (our account's balance) goes with it
    assertEquals(result.output, delivered(happy));
});

Deno.test(`${ID} not found (404): provider error, zero usage, message relayed`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { identifier: "no-such-profile-xyz" } },
        mode: "replay",
        fixture: await fixture("not-found"),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(typeof output.message, "string");
    assert((output.message as string).length > 0);
});

Deno.test(`${ID} bad key (401): provider error, zero usage, message relayed`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { identifier: "williamhgates" } },
        mode: "replay",
        fixture: await fixture("provider-error"),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(typeof output.message, "string");
    assert((output.message as string).length > 0);
});

Deno.test(`${ID} estimate: one flat fetch`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: { identifier: "williamhgates" },
    });
    assertEquals(usage, { credits: { default: 2 }, evidence: { CALL: 1 } });
});

Deno.test(`${ID} input gate: an empty identifier is rejected before the wire`, async () => {
    await assertRejects(
        async () =>
            await runEndpoint({
                unit: await testSealedUnit(ID),
                input: { body: { identifier: "" } },
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
            input: { body: { identifier: "williamhgates" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: a known public profile
        const output = (result.output as {
            output?: { found?: boolean; profile?: Record<string, unknown> };
        }).output;
        assertEquals(output?.found, true, JSON.stringify(result.output));
        assert(output?.profile);
        assertEquals(typeof output.profile.url, "string");
        assertEquals(typeof output.profile.name, "string");
    },
});
