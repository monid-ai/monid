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
const ID = "fiber#email-to-person/single";
const fixture = (name: string) =>
    loadFixture(`${fixturesDir}synthetic-${name}.json`);
/** What the caller sees: Fiber's body minus the `chargeInfo` receipt. */
const delivered = (f: Fixture) => ({
    output: (f.calls[0].res.body as { output: Json }).output,
});

Deno.test(`${ID} happy: one profile found draws one lookup, receipt stripped`, async () => {
    const happy = await fixture("happy");
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { email: "bill.gates@example.org" } },
        mode: "replay",
        fixture: happy,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { RESULT: 1 },
    });
    assertEquals(result.output, delivered(happy));
});

Deno.test(`${ID} miss: 200 with nothing found draws nothing`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { email: "nobody@example.com" } },
        mode: "replay",
        fixture: await fixture("miss"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID} role-based address rejected: 200 with nothing found draws nothing`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { email: "info@example.com" } },
        mode: "replay",
        fixture: await fixture("rejected"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID} opted out (410): provider error, zero usage, message relayed`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { email: "optedout@example.com" } },
        mode: "replay",
        fixture: await fixture("opted-out"),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(typeof output.message, "string");
    assert((output.message as string).length > 0);
});

Deno.test(`${ID} estimate: one lookup`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: { email: "bill.gates@example.org" },
    });
    assertEquals(usage, { credits: { default: 2 }, evidence: { RESULT: 1 } });
});

Deno.test(`${ID} input gate: a malformed email is rejected before the wire`, async () => {
    await assertRejects(
        async () =>
            await runEndpoint({
                unit: await testSealedUnit(ID),
                input: { body: { email: "not-an-email" } },
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
            input: { body: { email: "bill.gates@example.org" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: a valid lookup can miss (empty data)
        const output = result.output as { output?: { data?: unknown } };
        assert(Array.isArray(output.output?.data), JSON.stringify(output));
    },
});
