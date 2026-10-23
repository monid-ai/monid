import { assertEquals, assertRejects } from "@std/assert";
import type { OwnedResource } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * tinyfish#browser-profiles/release. The run makes NO upstream call (the
 * host runs the resource's lifecycle.release), so every test here runs
 * without a fixture — any network call would fail it. There is no vendor
 * error path to replay; the foreign-id gate is the only refusal.
 */

const ID = "tinyfish#browser-profiles/release";
const OWNED: OwnedResource[] = [{
    resource: "tinyfish/browser-profile",
    externalId: "prof_1",
    data: { name: "Salesforce Production", proxyCountryCode: "US" },
    syncedAt: "2026-10-21T00:00:00.000Z",
}];

Deno.test("tinyfish#browser-profiles/release happy: local ack, the settle marks the profile released", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { profileId: "prof_1" } },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 202);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        profileId: "prof_1",
        status: "release_requested",
        note: "The profile is being deleted upstream.",
    });
    assertEquals(result.resources?.releases, [{
        resource: "tinyfish/browser-profile",
        externalId: "prof_1",
    }]);
});

Deno.test("tinyfish#browser-profiles/release: a profile the workspace does not own is a 404", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { profileId: "prof_someone_else" } },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.resources?.releases, undefined);
});

Deno.test("tinyfish#browser-profiles/release schema gate: an empty profileId is rejected", async () => {
    const unit = await testSealedUnit(ID);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { profileId: "" } },
                mode: "replay",
                resources: OWNED,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { body: { profileId: "prof_1" } },
        mode: "replay",
        resources: OWNED,
    });
});

Deno.test({
    name: "tinyfish#browser-profiles/release live (gated on TINYFISH_API_KEY)",
    ignore: liveSkip("tinyfish"),
    fn: async () => {
        // still no upstream call: the live ack has the replay shape
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { profileId: "prof_1" } },
            mode: "live",
            resources: OWNED,
        });
        assertEquals(result.httpStatus, 202);
        assertEquals(
            Object.keys(result.output as Record<string, unknown>).sort(),
            ["note", "profileId", "status"],
        );
    },
});
