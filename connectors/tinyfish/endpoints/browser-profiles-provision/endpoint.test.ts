import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * tinyfish#browser-profiles/provision. Fixtures are SYNTHETIC, shaped from
 * the monid-services live drills. No live test: provisioning creates a real
 * profile on the shared vendor account and needs a teardown release — run
 * it deliberately via `deno task engine:run` (the saperly posture).
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
