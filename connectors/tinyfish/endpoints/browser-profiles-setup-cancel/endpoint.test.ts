import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * tinyfish#browser-profiles/setup-cancel. Fixtures are SYNTHETIC, shaped from the monid-services live
 * drills. Ownership is the fixture's story: `OWNED` seeds the one profile
 * the workspace holds.
 */

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const fixture = (name: string) => loadFixture(`${FIXTURES}${name}.json`);
const ID = "tinyfish#browser-profiles/setup-cancel";
const OWNED: OwnedResource[] = [{
    resource: "tinyfish/browser-profile",
    externalId: "prof_1",
    data: { name: "Salesforce Production", proxyCountryCode: "US" },
    syncedAt: "2026-10-21T00:00:00.000Z",
}];

Deno.test("tinyfish#browser-profiles/setup-cancel happy: the vendor's answer relays as-is", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { profileId: "prof_1", sessionId: "setup-1" } },
        mode: "replay",
        fixture: await fixture("synthetic-profile-setup-cancel"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { session_id: "setup-1", status: "cancelled" });
});

Deno.test("tinyfish#browser-profiles/setup-cancel provider error: a 404 is data, zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { profileId: "prof_1", sessionId: "setup-1" } },
        mode: "replay",
        fixture: await fixture("synthetic-profile-setup-cancel-gone"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("tinyfish#browser-profiles/setup-cancel: a profile the workspace does not own is a 404 with the upstream untouched", async () => {
    // no fixture: any upstream call would fail the test
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                ...{ profileId: "prof_1", sessionId: "setup-1" },
                profileId: "prof_someone_else",
            },
        },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("tinyfish#browser-profiles/setup-cancel schema gate: a missing or empty sessionId and the vendor's snake_case spelling are rejected", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const body of [
            { profileId: "prof_1", sessionId: "" },
            { profileId: "prof_1" },
            { profileId: "prof_1", session_id: "setup-1" },
        ] as Record<string, Json>[]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body },
                    mode: "replay",
                    resources: OWNED,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    for (
        const body of [
            { profileId: "prof_1", sessionId: "setup-1" },
        ] as Record<string, Json>[]
    ) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            resources: OWNED,
        });
    }
});

Deno.test({
    name:
        "tinyfish#browser-profiles/setup-cancel live (gated on TINYFISH_API_KEY)",
    ignore: liveSkip("tinyfish"),
    fn: async () => {
        // a profile id the vendor does not know: the answer is a provider
        // error with zero usage, and nothing is created upstream
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    profileId: "prof_monid_live_check",
                    sessionId: "setup_monid_live_check",
                },
            },
            mode: "live",
            resources: [{
                ...OWNED[0],
                externalId: "prof_monid_live_check",
            }],
        });
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
