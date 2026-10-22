import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import { loadFixture, loadResource, testResourceUnit } from "@shared/testing";

/**
 * tinyfish/browser-profile resource ops through the compiled doc. Ops
 * replay against merged chains, driven in order on one loaded resource.
 */

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const fixture = (name: string) => loadFixture(`${FIXTURES}${name}.json`);

const PROFILE: OwnedResource = {
    resource: "tinyfish/browser-profile",
    externalId: "prof_1",
    data: { name: "Salesforce Production", proxyCountryCode: "US" },
    syncedAt: "2026-10-21T00:00:00.000Z",
};

Deno.test("tinyfish/browser-profile: verify, the sanitized domains view, then release", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("tinyfish/browser-profile"),
        mode: "replay",
        fixture: await fixture("synthetic-profile-resource-ops"),
    });
    assertEquals(await resource.verify(PROFILE), { active: true });
    const view = await resource.view("domains", PROFILE) as Record<
        string,
        Json
    >;
    assertEquals(view.name, "Salesforce Production");
    assertEquals("fingerprint_seed" in view, false);
    assertEquals("id" in view, false);
    assertEquals(await resource.release(PROFILE), { released: true });
});

Deno.test("tinyfish/browser-profile: a 404 verify is inactive; an unconfirmed delete throws", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("tinyfish/browser-profile"),
        mode: "replay",
        fixture: await fixture("synthetic-profile-resource-gone"),
    });
    assertEquals(await resource.verify(PROFILE), {
        active: false,
        inactiveReason: "http_404",
    });
    await assertRejects(() => resource.release(PROFILE), Error, "409");
});
