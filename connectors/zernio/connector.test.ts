import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    loadResource,
    runEndpoint,
    testResourceUnit,
    testSealedUnit,
} from "@shared/testing";

/**
 * Chains are SYNTHETIC, shaped on Zernio's public OpenAPI spec. Ownership
 * is the fixture's story: `resources` seeds the reader, and a chain that
 * ENDS early proves the fn never made the next upstream call.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

const PROFILE = "aaaaaaaaaaaaaaaaaaaaaaaa";
const FOREIGN_PROFILE = "ffffffffffffffffffffffff";
const ACCOUNT = "cccccccccccccccccccccccc";
const LINKEDIN_ACCOUNT = "c2c2c2c2c2c2c2c2c2c2c2c2";
const FOREIGN_ACCOUNT = "dddddddddddddddddddddddd";
const POST = "eeeeeeeeeeeeeeeeeeeeeeee";
const HANDOFF = "79c6dbf2-97ba-4f34-b615-5bf9435526db";

const OWNED: OwnedResource[] = [{
    resource: "zernio/profile",
    externalId: PROFILE,
    data: { name: "Acme", timezone: "Europe/Madrid" },
}];

const asRecord = (value: Json) => value as Record<string, Json>;

Deno.test("zernio create-profile: seeds the profile under the caller's name", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#create-profile"),
        input: { body: { name: "Acme", timezone: "Europe/Madrid" } },
        mode: "replay",
        fixture: await fixture("synthetic-create-profile"),
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.usage.credits, {});
    const seed = result.resources?.provisions?.[0];
    assert(seed !== undefined, "expected a provision seed");
    assertEquals(seed.resource, "zernio/profile");
    assertEquals(seed.externalId, PROFILE);
    assertEquals(seed.identifier, "Acme");
    assertEquals(seed.data, { name: "Acme", timezone: "Europe/Madrid" });
    const out = asRecord(result.output);
    assertEquals(out.profileId, PROFILE);
    assertEquals(out.name, "Acme");
});

Deno.test("zernio create-profile: an upstream rejection provisions nothing and strips the pooled userId", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#create-profile"),
        input: { body: { name: "Acme" } },
        mode: "replay",
        fixture: await fixture("synthetic-create-profile-conflict"),
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.resources?.provisions ?? [], []);
    assertEquals(JSON.stringify(result.output).includes("userId"), false);
});

Deno.test("zernio list-profiles: served from the ownership window, no upstream call", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#list-profiles"),
        input: {},
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, [
        { profileId: PROFILE, name: "Acme", timezone: "Europe/Madrid" },
    ]);
});

Deno.test("zernio connect-account: returns the handoff link for the account owner", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#connect-account"),
        input: { body: { profileId: PROFILE, platform: "instagram" } },
        mode: "replay",
        fixture: await fixture("synthetic-connect-account"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    const out = asRecord(result.output);
    assertEquals(out.status, "waiting");
    assertEquals(out.handoffId, HANDOFF);
    assertEquals(out.url, "https://zernio.com/h/AbCd12");
    assertEquals(out.authUrl, undefined);
});

Deno.test("zernio connect-account: a foreign profile is the uniform pre-gate 404", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#connect-account"),
        input: { body: { profileId: FOREIGN_PROFILE, platform: "instagram" } },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage.credits, {});
});

Deno.test("zernio connect-status: connected accounts on the gated profile", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#connect-status"),
        input: { body: { profileId: PROFILE, handoffId: HANDOFF } },
        mode: "replay",
        fixture: await fixture("synthetic-connect-status-connected"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    const out = asRecord(result.output);
    assertEquals(out.status, "connected");
    assertEquals(out.accounts, [{ accountId: ACCOUNT, username: "acme" }]);
});

Deno.test("zernio connect-status: another tenant's handoff answers 404 and leaks nothing", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#connect-status"),
        input: { body: { profileId: PROFILE, handoffId: HANDOFF } },
        mode: "replay",
        fixture: await fixture("synthetic-connect-status-foreign"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(JSON.stringify(result.output).includes("someone-else"), false);
});

Deno.test("zernio list-accounts: filtered by the gated profile and projected", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#list-accounts"),
        input: { body: { profileId: PROFILE } },
        mode: "replay",
        fixture: await fixture("synthetic-list-accounts"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    const items = result.output as Json[];
    assertEquals(items.length, 2);
    assertEquals(asRecord(items[0]).accountId, ACCOUNT);
    assertEquals(asRecord(items[0]).platform, "twitter");
    assertEquals(JSON.stringify(result.output).includes("userId"), false);
});

Deno.test("zernio create-post: publishes now and bills one flat post", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#create-post"),
        input: {
            body: {
                profileId: PROFILE,
                content: "We just launched!",
                platforms: [
                    { accountId: ACCOUNT },
                    { accountId: LINKEDIN_ACCOUNT },
                ],
            },
        },
        mode: "replay",
        fixture: await fixture("synthetic-create-post-now"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.usage.credits, { default: 0.01 });
    const out = asRecord(result.output);
    assertEquals(out.postId, POST);
    assertEquals(out.status, "published");
    const platforms = out.platforms as Json[];
    assertEquals(
        asRecord(platforms[0]).platformPostUrl,
        "https://x.com/acme/status/1850",
    );
    assertEquals(asRecord(platforms[0]).accountId, ACCOUNT);
    assertEquals(out.metadata, undefined);
    assertEquals(JSON.stringify(out).includes("userId"), false);
});

Deno.test("zernio create-post: a partial publish reports the failed network", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#create-post"),
        input: {
            body: {
                profileId: PROFILE,
                content: "We just launched!",
                platforms: [
                    { accountId: ACCOUNT },
                    { accountId: LINKEDIN_ACCOUNT },
                ],
            },
        },
        mode: "replay",
        fixture: await fixture("synthetic-create-post-partial"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 207);
    assertEquals(result.usage.credits, { default: 0.01 });
    const platforms = asRecord(result.output).platforms as Json[];
    assertEquals(asRecord(platforms[1]).status, "failed");
    assertEquals(
        asRecord(platforms[1]).errorMessage,
        "LinkedIn rejected the image: unsupported format",
    );
});

Deno.test("zernio create-post: an account outside the gated profile is refused before any POST", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#create-post"),
        input: {
            body: {
                profileId: PROFILE,
                content: "hijack",
                platforms: [{ accountId: FOREIGN_ACCOUNT }],
            },
        },
        mode: "replay",
        fixture: await fixture("synthetic-create-post-foreign-account"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage.credits, {});
});

Deno.test("zernio create-post: a foreign profile is the uniform pre-gate 404", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#create-post"),
        input: {
            body: {
                profileId: FOREIGN_PROFILE,
                content: "hijack",
                platforms: [{ accountId: ACCOUNT }],
            },
        },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage.credits, {});
});

Deno.test("zernio get-post: a post of the gated profile, projected", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#get-post"),
        input: { body: { profileId: PROFILE, postId: POST } },
        mode: "replay",
        fixture: await fixture("synthetic-get-post"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    const out = asRecord(result.output);
    assertEquals(out.status, "scheduled");
    assertEquals(out.metadata, undefined);
});

Deno.test("zernio get-post: a post tagged for another profile answers 404", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#get-post"),
        input: { body: { profileId: PROFILE, postId: POST } },
        mode: "replay",
        fixture: await fixture("synthetic-get-post-foreign"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
});

Deno.test("zernio upload-media: relays the presigned upload", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#upload-media"),
        input: { body: { filename: "launch.mp4", contentType: "video/mp4" } },
        mode: "replay",
        fixture: await fixture("synthetic-upload-media"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(
        asRecord(result.output).publicUrl,
        "https://media.zernio.com/temp/1_abc_launch.mp4",
    );
});

Deno.test("zernio release-profile: a local ack that marks the release", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("zernio#release-profile"),
        input: { body: { profileId: PROFILE } },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 202);
    assertEquals(result.resources?.releases?.[0]?.externalId, PROFILE);
});

Deno.test("zernio resource: release disconnects every account, then deletes the profile", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("zernio/profile"),
        mode: "replay",
        fixture: await fixture("synthetic-profile-release"),
    });
    assertEquals(await resource.release(OWNED[0]), { released: true });
});

Deno.test("zernio resource: verify on a deleted profile is inactive", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("zernio/profile"),
        mode: "replay",
        fixture: await fixture("synthetic-profile-verify-gone"),
    });
    assertEquals(await resource.verify(OWNED[0]), {
        active: false,
        inactiveReason: "http_404",
    });
});

Deno.test({
    name: "zernio live: upload-media returns a presigned url",
    ignore: liveSkip("zernio"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("zernio#upload-media"),
            input: {
                body: { filename: "probe.png", contentType: "image/png" },
            },
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assert(
            typeof asRecord(result.output).publicUrl === "string",
            "expected a publicUrl",
        );
    },
});
