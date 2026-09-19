import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "zensched#guide";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: {} };

Deno.test(`${ID} happy (synthetic): free, guide payload`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    assertEquals(fixture.calls.length, 1);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(typeof output.guide, "string");
    assertEquals("billing" in output, false);
});

Deno.test(`${ID} provider error (synthetic 503): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 503);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: the compiled schema rejects unknown body fields`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { extra: "field" } as Record<string, Json> },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
});

Deno.test({
    name:
        `${ID} live (gated on ZENSCHED_API_KEY — public funnel, key unused on wire)`,
    ignore: liveSkip("zensched", ["apiKey"]),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assert(typeof output.guide === "string" && output.guide.length > 0);
        assertEquals("billing" in output, false);
    },
});
