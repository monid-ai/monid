import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * tinyfish#browser-profiles/provision. Fixtures are SYNTHETIC, shaped from
 * the monid-services live drills.
 *
 * The live test CREATES a real profile on the vendor account, so it runs
 * only when TINYFISH_LIVE_MUTATE=1 is set beside the key — a key alone
 * never creates state. Delete the profile it reports afterwards.
 */

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const fixture = (name: string) => loadFixture(`${FIXTURES}${name}.json`);
const ID = "tinyfish#browser-profiles/provision";
const INPUT = {
    body: { name: "Salesforce Production", proxyCountryCode: "US" },
};

Deno.test("tinyfish#browser-profiles/provision happy: seeds the owned profile; fingerprint_seed never leaves", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-profile-provision"),
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        profileId: "prof_1",
        name: "Salesforce Production",
        proxyCountryCode: "US",
        createdAt: "2026-10-21T01:00:00Z",
    });
    const seed = result.resources?.provisions?.[0];
    assert(seed !== undefined, "expected a provision seed");
    assertEquals(seed.resource, "tinyfish/browser-profile");
    assertEquals(seed.externalId, "prof_1");
    assertEquals(seed.identifier, "Salesforce Production");
    assertEquals(seed.data, {
        name: "Salesforce Production",
        proxyCountryCode: "US",
    });
});

Deno.test("tinyfish#browser-profiles/provision provider error: a rejected create is data and seeds nothing", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-profile-provision-rejected"),
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources?.provisions, undefined);
});

Deno.test("tinyfish#browser-profiles/provision schema gate: name over 100 chars and unknown proxy countries are rejected", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const body of [
            { name: "x".repeat(101) },
            { name: "Salesforce", proxyCountryCode: "ES" },
            { name: "Salesforce", set_as_default: true },
        ] as Record<string, Json>[]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
    // near-twins: the bound itself and a documented country pass
    for (
        const body of [
            { name: "x".repeat(100) },
            { name: "Salesforce", proxyCountryCode: "US" },
        ] as Record<string, Json>[]
    ) {
        await assertInputAccepted({ unit, input: { body }, mode: "replay" });
    }
});

Deno.test({
    name:
        "tinyfish#browser-profiles/provision live (gated on TINYFISH_API_KEY + TINYFISH_LIVE_MUTATE=1)",
    ignore: liveSkip("tinyfish") ||
        Deno.env.get("TINYFISH_LIVE_MUTATE") !== "1",
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { name: "monid live check" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, Json>;
        assertEquals(typeof output.profileId, "string");
        assertEquals("fingerprint_seed" in output, false);
        const seed = result.resources?.provisions?.[0];
        assert(seed !== undefined, "expected a provision seed");
        assertEquals(seed.externalId, output.profileId);
        console.log(`created TinyFish profile ${seed.externalId} — delete it`);
    },
});
