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
    liveSkip,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

/**
 * tinyfish#automation/run. Fixtures are SYNTHETIC, shaped from the
 * monid-services live drills. Ownership is the fixture's story: `OWNED`
 * seeds the one profile the workspace holds.
 *
 * Rate under test: $0.016 per AI step (https://www.tinyfish.ai/pricing,
 * checked 2026-10-22).
 *
 * The live test BILLS real agent steps (max_steps 1, about two steps), so it
 * runs only when TINYFISH_LIVE_MUTATE=1 is set beside the key — a key alone
 * never spends. It also needs TINYFISH_LIVE_BETA=1: `max_steps` is a vendor
 * beta, and a key without it answers 403.
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

/** What `start` sends upstream for `body` (TinyFish answers a run id). */
async function sentBody(body: Record<string, Json>) {
    const sent: Record<string, Json>[] = [];
    const engine = new Engine({
        // no profileId in these bodies, so the reader is never consulted
        resources: { owned: () => Promise.resolve([]) },
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_input, init) => {
                const req = (init ?? {}) as { body?: unknown };
                sent.push(JSON.parse(String(req.body)));
                return Promise.resolve(
                    new Response(JSON.stringify({ run_id: "run_1" }), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(AGENT));
    const started = await loaded.start({ body });
    assertEquals(started.kind, RunKind.RUNNING);
    assertEquals(sent.length, 1);
    return sent[0];
}

Deno.test("tinyfish#automation/run: agent_config carries only what the caller set — max_steps is a vendor beta", async () => {
    // no cap and no budget: no agent_config at all, so a non-beta key is
    // not refused with 403 (the hold still assumes the 150 default — the
    // estimate test above)
    const bare = { url: "https://scrapeme.live/shop", goal: "x" };
    assertEquals(await sentBody(bare), bare);
    // a budget alone sends no max_steps
    assertEquals(
        (await sentBody({ ...bare, max_duration_seconds: 60 })).agent_config,
        { max_duration_seconds: 60 },
    );
    // a cap the caller set is sent
    assertEquals(
        (await sentBody({ ...bare, max_steps: 10 })).agent_config,
        { max_steps: 10 },
    );
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

Deno.test({
    name:
        "tinyfish#automation/run live (gated on TINYFISH_API_KEY + TINYFISH_LIVE_MUTATE=1 + TINYFISH_LIVE_BETA=1)",
    ignore: liveSkip("tinyfish") ||
        Deno.env.get("TINYFISH_LIVE_MUTATE") !== "1" ||
        Deno.env.get("TINYFISH_LIVE_BETA") !== "1",
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(AGENT),
            input: {
                body: {
                    url: "https://example.com",
                    goal: "Return the page title",
                    max_steps: 1,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
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
        assertEquals(Object.keys(result.usage.evidence), ["CREDIT"]);
    },
});
