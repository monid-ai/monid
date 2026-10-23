import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("agent-vault#v1/tokens catalog: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/tokens");
    const fixture = await loadFixture(`${fixturesDir}catalog.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "queryParams": {
                "url": "https://shop.example.com/checkout",
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("agent-vault#v1/tokens provider-error: replays as provider error (401), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/tokens");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test({
    name: "agent-vault#v1/tokens live (gated on AGENT_VAULT_API_KEY)",
    ignore: liveSkip("agent-vault"),
    fn: async () => {
        const unit = await testSealedUnit("agent-vault#v1/tokens");
        const result = await runEndpoint({ unit, input: {}, mode: "live" });
        assertEquals(result.httpStatus, 200);
        assert(Array.isArray((result.output as { cards: unknown[] }).cards));
    },
});
