import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "zensched#account-create";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { org_name: "Demo Field Crew" } };

Deno.test(`${ID} happy (synthetic): free, org + key`, async () => {
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
    assertEquals(output.org_name, "Demo Field Crew");
    assertEquals(typeof output.api_key, "string");
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

Deno.test(`${ID}: org_name required, bounded 1-200, strict body`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const run = (body: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { body: body as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            {},
            { org_name: "" },
            { org_name: "x".repeat(201) },
            { org_name: "Demo Field Crew", extra: true },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    const result = await run({ org_name: "Demo Field Crew" });
    assertEquals(result.isProviderError, false);
});

Deno.test({
    name:
        `${ID} live (gated on ZENSCHED_API_KEY — creates a real org; key unused on wire)`,
    ignore: liveSkip("zensched", ["apiKey"]),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const orgName = `Monid live ${Date.now()}`;
        const result = await runEndpoint({
            unit,
            input: { body: { org_name: orgName } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assertEquals(output.org_name, orgName);
        assert(
            typeof output.api_key === "string" &&
                String(output.api_key).startsWith("zsc_"),
        );
        assertEquals("billing" in output, false);
    },
});
