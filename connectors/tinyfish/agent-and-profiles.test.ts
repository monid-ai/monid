import {
    assert,
    assertAlmostEquals,
    assertEquals,
    assertRejects,
} from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, type OwnedResource, RunKind, StopKind } from "@shared/core";
import {
    loadEndpoint,
    loadFixture,
    loadResource,
    runEndpoint,
    testResourceUnit,
    testSealedUnit,
} from "@shared/testing";

/**
 * The TinyFish agent run and the browser-profile family, through the
 * compiled docs. Fixtures are SYNTHETIC, shaped from the monid-services
 * live drills (adaptors/tinyfish/**). Ownership is the fixture's story:
 * `OWNED` seeds the one profile the workspace holds.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

const PROFILE: OwnedResource = {
    resource: "tinyfish/browser-profile",
    externalId: "prof_1",
    data: { name: "Salesforce Production", proxyCountryCode: "US" },
    syncedAt: "2026-10-21T00:00:00.000Z",
};
const OWNED: OwnedResource[] = [PROFILE];

const RUN_INPUT = {
    body: {
        url: "https://scrapeme.live/shop",
        goal: "Extract the first product name and price",
        max_steps: 10,
        profileId: "prof_1",
    },
};
const AGENT = "tinyfish#automation/run";

// ---------------------------------------------------------------------------
// automation/run — $0.016 per AI step (the public list rate)
// ---------------------------------------------------------------------------

Deno.test("tinyfish#automation/run: completed run bills its terminal steps; output is allowlisted", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(AGENT),
        input: RUN_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-agent-run-completed"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.evidence, { CREDIT: 3 });
    assertAlmostEquals(result.usage.credits.default ?? 0, 0.048);
    const output = result.output as Record<string, Json>;
    assertEquals(Object.keys(output).sort(), [
        "error",
        "finished_at",
        "num_of_steps",
        "result",
        "run_id",
        "started_at",
        "status",
    ]);
    assertEquals(output.status, "COMPLETED");
});

Deno.test("tinyfish#automation/run: a FAILED run still bills the steps it executed", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(AGENT),
        input: RUN_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-agent-run-failed"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.evidence, { CREDIT: 2 });
    assertAlmostEquals(result.usage.credits.default ?? 0, 0.032);
});

Deno.test("tinyfish#automation/run: a rejected submit relays as data, zero-billed", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(AGENT),
        input: RUN_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-agent-run-rejected"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("tinyfish#automation/run: a profile the workspace does not own is a 404 with the upstream untouched", async () => {
    // no fixture: any upstream call would fail the test
    const result = await runEndpoint({
        unit: await testSealedUnit(AGENT),
        input: RUN_INPUT,
        mode: "replay",
        resources: [],
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("tinyfish#automation/run: estimate is the step cap plus the measured overshoot", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(AGENT),
        input: RUN_INPUT,
        mode: "replay",
        resources: OWNED,
    });
    // an explicit cap of 10 → 12 steps
    const capped = loaded.estimate(RUN_INPUT);
    assertEquals(capped.evidence, { CREDIT: 12 });
    assertAlmostEquals(capped.credits.default ?? 0, 0.192);
    // no cap → the vendor's documented default of 150, plus 2
    const uncapped = loaded.estimate({
        body: { url: "https://scrapeme.live/shop", goal: "Read the title" },
    });
    assertEquals(uncapped.evidence, { CREDIT: 152 });
});

Deno.test("tinyfish#automation/run: STOP cancels, drains, and bills the executed steps", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(AGENT),
        input: RUN_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-agent-run-stop"),
        resources: OWNED,
    });
    const run = { runId: "test-run-1" };
    const started = await loaded.start(RUN_INPUT, run);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(RUN_INPUT, started.state, run);
    assert(stopped.kind === RunKind.COMPLETED, "stop settles");
    assertEquals(stopped.usage.evidence, { CREDIT: 2 });
    assertAlmostEquals(stopped.usage.credits.default ?? 0, 0.032);
});

Deno.test("tinyfish#automation/run: STOP before the first step settles nothing", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(AGENT),
        input: RUN_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-agent-run-stop-zero"),
        resources: OWNED,
    });
    const run = { runId: "test-run-2" };
    const started = await loaded.start(RUN_INPUT, run);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(RUN_INPUT, started.state, run);
    assertEquals(stopped.kind, StopKind.STOPPED_UNSETTLED);
});

// ---------------------------------------------------------------------------
// browser-profiles/* — free; every operation is ownership-gated
// ---------------------------------------------------------------------------

Deno.test("tinyfish#browser-profiles/provision: seeds the owned profile; fingerprint_seed never leaves", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("tinyfish#browser-profiles/provision"),
        input: {
            body: { name: "Salesforce Production", proxyCountryCode: "US" },
        },
        mode: "replay",
        fixture: await fixture("synthetic-profile-provision"),
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const seed = result.resources?.provisions?.[0];
    assert(seed !== undefined, "expected a provision seed");
    assertEquals(seed.resource, "tinyfish/browser-profile");
    assertEquals(seed.externalId, "prof_1");
    assertEquals(seed.identifier, "Salesforce Production");
    assertEquals(seed.data, {
        name: "Salesforce Production",
        proxyCountryCode: "US",
    });
    assertEquals(result.output, {
        profileId: "prof_1",
        name: "Salesforce Production",
        proxyCountryCode: "US",
        createdAt: "2026-10-21T01:00:00Z",
    });
});

Deno.test("tinyfish#browser-profiles/setup-session: owned profile opens a setup browser", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("tinyfish#browser-profiles/setup-session"),
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
    const output = result.output as Record<string, Json>;
    assertEquals(output.session_id, "setup-1");
    assertEquals(output.cdp_url, "wss://cdp.example.com/setup-1");
    // the vendor's account-level fields stay out
    assertEquals("account_id" in output, false);
});

Deno.test("tinyfish#browser-profiles/setup-session: a foreign profile is a 404 with the upstream untouched", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("tinyfish#browser-profiles/setup-session"),
        input: { body: { profileId: "prof_someone_else" } },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("tinyfish#browser-profiles/setup-save and setup-cancel: owned profile, snake_case on the wire", async () => {
    const input = { body: { profileId: "prof_1", sessionId: "setup-1" } };
    const saved = await runEndpoint({
        unit: await testSealedUnit("tinyfish#browser-profiles/setup-save"),
        input,
        mode: "replay",
        fixture: await fixture("synthetic-profile-setup-save"),
        resources: OWNED,
    });
    assertEquals(saved.httpStatus, 200);
    assertEquals((saved.output as Record<string, Json>).cookie_count, 12);
    const cancelled = await runEndpoint({
        unit: await testSealedUnit("tinyfish#browser-profiles/setup-cancel"),
        input,
        mode: "replay",
        fixture: await fixture("synthetic-profile-setup-cancel"),
        resources: OWNED,
    });
    assertEquals(cancelled.httpStatus, 200);
    assertEquals(cancelled.usage, { credits: {}, evidence: {} });
});

Deno.test("tinyfish#browser-profiles/release: local ack, the settle marks the profile released", async () => {
    // no fixture: the run itself makes no upstream call
    const result = await runEndpoint({
        unit: await testSealedUnit("tinyfish#browser-profiles/release"),
        input: { body: { profileId: "prof_1" } },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 202);
    assertEquals(result.usage.credits, {});
    assertEquals(result.resources?.releases, [{
        resource: "tinyfish/browser-profile",
        externalId: "prof_1",
    }]);
});

// ---------------------------------------------------------------------------
// tinyfish/browser-profile resource ops
// ---------------------------------------------------------------------------

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
