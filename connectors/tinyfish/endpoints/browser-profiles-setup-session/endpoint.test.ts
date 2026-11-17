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
 * tinyfish#browser-profiles/setup-session. Fixtures are SYNTHETIC, shaped from the monid-services live
 * drills. Ownership is the fixture's story: `OWNED` seeds the one profile
 * the workspace holds.
 */

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const fixture = (name: string) => loadFixture(`${FIXTURES}${name}.json`);
const ID = "tinyfish#browser-profiles/setup-session";
const OWNED: OwnedResource[] = [{
    resource: "tinyfish/browser-profile",
    externalId: "prof_1",
    data: { name: "Salesforce Production", proxyCountryCode: "US" },
    syncedAt: "2026-10-21T00:00:00.000Z",
}];

Deno.test("tinyfish#browser-profiles/setup-session happy: allowlisted: the vendor's account_id stays out", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                profileId: "prof_1",
                targetUrl: "https://app.example.com/login",
                timeoutSeconds: 900,
            },
        },
        mode: "replay",
        fixture: await fixture("synthetic-profile-setup-session"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        session_id: "setup-1",
        cdp_url: "wss://cdp.example.com/setup-1",
        base_url: "https://browser.example.com/setup-1",
        timeout_seconds: 900,
        expires_at: "2026-10-21T01:15:00Z",
    });
});

Deno.test("tinyfish#browser-profiles/setup-session provider error: a 404 is data, zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { profileId: "prof_1" } },
        mode: "replay",
        fixture: await fixture("synthetic-profile-setup-session-gone"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("tinyfish#browser-profiles/setup-session: a profile the workspace does not own is a 404 with the upstream untouched", async () => {
    // no fixture: any upstream call would fail the test
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                ...{ profileId: "prof_1" },
                profileId: "prof_someone_else",
            },
        },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("tinyfish#browser-profiles/setup-session schema gate: timeoutSeconds outside 60-3600 and the vendor's own field names are rejected", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const body of [
            { profileId: "prof_1", timeoutSeconds: 59 },
            { profileId: "prof_1", timeoutSeconds: 3601 },
            { profileId: "prof_1", url: "https://x.example" },
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
            { profileId: "prof_1", timeoutSeconds: 60 },
            { profileId: "prof_1", timeoutSeconds: 3600 },
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
        "tinyfish#browser-profiles/setup-session live (gated on TINYFISH_API_KEY)",
    ignore: liveSkip("tinyfish"),
    fn: async () => {
        // a profile id the vendor does not know: the answer is a provider
        // error with zero usage, and nothing is created upstream
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { profileId: "prof_monid_live_check" } },
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
