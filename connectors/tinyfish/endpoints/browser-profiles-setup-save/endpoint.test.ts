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
 * tinyfish#browser-profiles/setup-save. Fixtures are SYNTHETIC, shaped from the monid-services live
 * drills. Ownership is the fixture's story: `OWNED` seeds the one profile
 * the workspace holds.
 */

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const fixture = (name: string) => loadFixture(`${FIXTURES}${name}.json`);
const ID = "tinyfish#browser-profiles/setup-save";
const OWNED: OwnedResource[] = [{
    resource: "tinyfish/browser-profile",
    externalId: "prof_1",
    data: { name: "Salesforce Production", proxyCountryCode: "US" },
    syncedAt: "2026-10-21T00:00:00.000Z",
}];

Deno.test("tinyfish#browser-profiles/setup-save happy: the vendor's save summary relays as-is", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { profileId: "prof_1", sessionId: "setup-1" } },
        mode: "replay",
        fixture: await fixture("synthetic-profile-setup-save"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        domains_updated: ["app.example.com"],
        domains_failed: [],
        cookie_count: 12,
        pages_captured: 1,
    });
});

Deno.test("tinyfish#browser-profiles/setup-save provider error: a 409 is data, zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { profileId: "prof_1", sessionId: "setup-1" } },
        mode: "replay",
        fixture: await fixture("synthetic-profile-setup-save-expired"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("tinyfish#browser-profiles/setup-save: a profile the workspace does not own is a 404 with the upstream untouched", async () => {
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

Deno.test("tinyfish#browser-profiles/setup-save schema gate: a missing or empty sessionId and the vendor's snake_case spelling are rejected", async () => {
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
        "tinyfish#browser-profiles/setup-save live (gated on TINYFISH_API_KEY)",
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
