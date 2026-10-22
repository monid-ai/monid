import {
    assert,
    assertAlmostEquals,
    assertEquals,
    assertRejects,
} from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, type OwnedResource, RunKind, StopKind } from "@shared/core";
import {
    assertInputAccepted,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * tinyfish#automation/run. Fixtures are SYNTHETIC, shaped from the
 * monid-services live drills. Ownership is the fixture's story: `OWNED`
 * seeds the one profile the workspace holds.
 *
 * Rate under test: $0.016 per AI step (https://www.tinyfish.ai/pricing,
 * checked 2026-10-22).
 *
 * No live test: every run bills real agent steps on the shared vendor
 * account — run it deliberately via `deno task engine:run`.
 */

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const fixture = (name: string) => loadFixture(`${FIXTURES}${name}.json`);

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

Deno.test("tinyfish#automation/run schema gate: a bare domain, a step cap over 500, and vendor-only fields are rejected", async () => {
    const unit = await testSealedUnit(AGENT);
    for (
        const body of [
            { url: "scrapeme.live/shop", goal: "Read the title" },
            { url: "https://scrapeme.live", goal: "Read", max_steps: 501 },
            { url: "https://scrapeme.live", goal: "Read", use_vault: true },
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
    // near-twins: the scheme-qualified URL and the cap itself pass
    for (
        const body of [
            { url: "https://scrapeme.live/shop", goal: "Read the title" },
            { url: "https://scrapeme.live", goal: "Read", max_steps: 500 },
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
