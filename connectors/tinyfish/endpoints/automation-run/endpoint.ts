import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { zAutomationRunBody } from "./schema/inputs.ts";

/**
 * `/automation/run` — TinyFish's Agent API as an async run (ported from
 * monid-services `adaptors/tinyfish/endpoints/automation-run.ts`):
 *
 *   start  POST /v1/automation/run-async  → {run_id}   (no status field)
 *   poll   GET  /v1/runs/{id}?screenshots=none&html=none
 *   stop   POST /v1/runs/{id}/cancel      (idempotent upstream), then drain
 *
 * BILLING: TinyFish lists the agent in dollars — $0.016 per AI step
 * (tinyfish.ai/pricing). Steps are counted under `Unit.CREDIT`, the closest
 * unit the contract has (there is no STEP unit). The terminal `num_of_steps` is the evidence for COMPLETED, FAILED, and
 * CANCELLED runs alike — TinyFish charges every EXECUTED step regardless of
 * outcome (a cancel before step 1 bills nothing).
 *
 * PROFILES: `profileId` is optional, so the ownership check cannot be a
 * keyed binding (an absent key is INVALID_INPUT). The binding is keyless and
 * start checks `utils.resources.owned` itself — a foreign or unknown id
 * answers the uniform 404 with the upstream untouched. Only then does start
 * send `use_profile: true, profile_id`.
 */
export default defineEndpoint({
    meta: {
        displayName: "TinyFish Browser Agent",
        summary: "Run an AI browser agent against any website from a " +
            "natural-language goal.",
        description: "AI browser automation from a natural-language 'goal': " +
            "the agent opens 'url' in a real browser, navigates, clicks, " +
            "types, and extracts, then returns 'result' (optionally shaped " +
            "by 'output_schema'). Billed per AI step — set 'max_steps' to " +
            "bound cost; the run stops at the cap and returns partial " +
            "results. 'max_duration_seconds' adds a soft wall-clock budget. " +
            "For protected sites use browser_profile 'stealth' plus " +
            "'proxy_config'. For logged-in sites, create a browser profile " +
            "(/browser-profiles/provision), save a login via its setup " +
            "session, and pass 'profileId'. A COMPLETED status means the " +
            "browser ran — check 'result' to see whether the goal was " +
            "achieved. The run is stoppable.",
        docsUrl: "https://docs.tinyfish.ai/agent-api/reference",
        categories: ["agents", "web-extraction"],
        notes: [
            "Billed on the run's terminal step count for COMPLETED, FAILED, " +
            "and CANCELLED outcomes alike; a run stopped before its first " +
            "step bills nothing. max_steps can overshoot by about one " +
            "final wrap-up step.",
            "COMPLETED means the browser ran, not that the goal was " +
            "achieved — validate the 'result' content.",
            "Password-manager vault access and account-default profiles " +
            "are unavailable; saved logins go through browser profiles you " +
            "own ('profileId').",
        ],
    },
    endpoint: "/automation/run",
    request: { method: "POST", path: "/v1/automation/run-async" },
    input: {
        // `max_steps` defaults to the vendor's own documented cap (150) at
        // the binding (design D25): it is the estimate's basis, and
        // materializing it sends exactly what the vendor would assume.
        schema: {
            body: zAutomationRunBody.extend({
                max_steps: zAutomationRunBody.shape.max_steps.unwrap()
                    .default(150),
            }),
        },
    },
    // A queued run plus the 1800 s soft budget with its ~2x overshoot.
    timeouts: { requestMs: 30_000, pollMs: 5_000, runMs: 3_900_000 },
    resources: { reads: [{ id: "tinyfish/browser-profile" }] },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "AI steps",
            consumes: { credit: "default", amount: 0.016 },
        },
        /** The step cap plus 2: monid-services measured `max_steps: 3`
         *  finishing at 4 steps (the wrap-up step past the cap bills). */
        estimate: ({ data }) => ({
            counts: { "CREDIT": data.input.body!.max_steps + 2 },
        }),
        /** The terminal `num_of_steps` (absent or null ⇒ nothing ran). */
        evidence: ({ data, utils }) => ({
            counts: {
                "CREDIT":
                    utils.json.optionalNum(data.output, "$.num_of_steps") ??
                        0,
            },
        }),
    },
    output: {
        /** Allowlist: `streaming_url`, `video_url`, `steps[]`,
         *  `profile_*`, and `browser_config` are unauthenticated URLs or
         *  account-level fields of the shared vendor account. */
        fromResponse: ({ data, utils }) =>
            utils.json.pick(data.output, [
                "$.run_id",
                "$.status",
                "$.result",
                "$.error",
                "$.num_of_steps",
                "$.started_at",
                "$.finished_at",
            ]),
    },
    lifecycle: {
        /** Non-2xx (403 beta gates, 402 vendor balance, 429 the shared
         *  key's rate limit) relays as data, zero-billed. */
        start: async ({ data, utils }) => {
            const $ = utils.json;
            const body = data.input.body!;
            if (body.profileId !== undefined) {
                const owned = await utils.resources.owned({
                    resource: "tinyfish/browser-profile",
                    externalId: body.profileId,
                });
                if (owned.length === 0) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: 404,
                        output: {
                            code: "profile_not_found",
                            message: "Browser profile " + body.profileId +
                                " not found",
                        } as Json,
                    };
                }
            }
            const res = await utils.http({
                method: "POST",
                path: "/v1/automation/run-async",
                body: {
                    url: body.url,
                    goal: body.goal,
                    agent_config: {
                        max_steps: body.max_steps,
                        ...(body.max_duration_seconds !== undefined
                            ? {
                                max_duration_seconds: body.max_duration_seconds,
                            }
                            : {}),
                    },
                    ...(body.browser_profile !== undefined
                        ? { browser_profile: body.browser_profile }
                        : {}),
                    ...(body.proxy_config !== undefined
                        ? { proxy_config: body.proxy_config }
                        : {}),
                    ...(body.output_schema !== undefined
                        ? { output_schema: body.output_schema as Json }
                        : {}),
                    ...(body.profileId !== undefined
                        ? { use_profile: true, profile_id: body.profileId }
                        : {}),
                },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const runId = $.optionalStr(res.body, "$.run_id");
            if (runId === undefined) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: {
                        code: "malformed_run",
                        message: "TinyFish returned success but no run_id",
                    } as Json,
                };
            }
            return { kind: "RUNNING", state: { externalRunId: runId } };
        },
        /** PENDING/RUNNING ⇒ still going; any other status is terminal and
         *  relays as data (its `num_of_steps` is the bill). 429/5xx THROW
         *  — a transient blip must not settle the run at $0 while the
         *  agent keeps stepping on the shared account; other non-2xx are
         *  definitive (the run is gone, or our key) and relay as data. */
        poll: async ({ data, utils }) => {
            const $ = utils.json;
            const runId = data.lifecycle.state.externalRunId;
            if (runId === undefined) {
                throw Object.assign(
                    new Error("tinyfish agent poll without externalRunId"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: "/v1/runs/" + runId,
                queryParams: { screenshots: "none", html: "none" },
            });
            if (res.status === 429 || res.status >= 500) {
                throw new Error(
                    "tinyfish agent poll failed with HTTP " + res.status,
                );
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = $.optionalStr(res.body, "$.status");
            if (status === undefined) {
                throw Object.assign(
                    new Error(
                        "tinyfish agent run " + runId +
                            " answered with no status",
                    ),
                    { retriable: false },
                );
            }
            if (status === "PENDING" || status === "RUNNING") {
                return { kind: "RUNNING", state: { externalRunId: runId } };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
                state: { externalRunId: runId },
            };
        },
        /** Cancel (best-effort — the drain decides), then drain the
         *  terminal record so the settle carries `num_of_steps`. A cancel
         *  before the first step settles nothing (void ⇒
         *  STOPPED_UNSETTLED); a record that never turns terminal in
         *  budget is UNRESOLVED. */
        stop: async ({ data, utils, logger }) => {
            const $ = utils.json;
            const runId = data.lifecycle.state.externalRunId;
            if (runId === undefined) {
                return {
                    kind: "UNRESOLVED",
                    reason: "no run id in state — nothing to cancel",
                };
            }
            const cancel = await utils.http({
                method: "POST",
                path: "/v1/runs/" + runId + "/cancel",
                body: {},
            });
            logger.info("tinyfish agent cancel requested", {
                runId,
                status: cancel.status,
            });
            for (let attempt = 0; attempt < 3; attempt++) {
                if (attempt > 0) await utils.sleep(2_000);
                const res = await utils.http({
                    method: "GET",
                    path: "/v1/runs/" + runId,
                    queryParams: { screenshots: "none", html: "none" },
                });
                if (res.status < 200 || res.status >= 300) continue;
                const status = $.optionalStr(res.body, "$.status");
                if (
                    status === undefined || status === "PENDING" ||
                    status === "RUNNING"
                ) continue;
                const steps = $.optionalNum(res.body, "$.num_of_steps") ?? 0;
                if (status === "CANCELLED" && steps === 0) return;
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                    state: { externalRunId: runId },
                };
            }
            return {
                kind: "UNRESOLVED",
                reason: "cancel requested but the run never turned " +
                    "terminal in budget",
                state: { externalRunId: runId },
            };
        },
    },
});
