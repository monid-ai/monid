import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zEnrichBody, zEnrichPathParams } from "./schema/inputs.ts";

/**
 * `POST /v3/enrich/{profile_id}` — build one person's profile deeper.
 *
 * ASYNC. The submit answers `202` with `request_id` and `status: "running"`
 * when Orbit dispatched work; the lifecycle polls the status route named in
 * `links.status` until the status is terminal, so one monid run returns the
 * finished profile.
 *
 * DISPATCH IS THE BILLING SIGNAL. Orbit charges for a profile it BUILT, and
 * an enrich whose target already sits at the requested depth is a no-op that
 * settles at zero. The public snapshot reports the depth reached, never
 * whether work was needed to reach it — but the dispatch does: Orbit answers
 * `running` exactly when it started building, and answers terminally on the
 * submit when there was nothing to do. `start` records which of the two
 * happened in `state.data.dispatched`, and `evidence` settles the depth line
 * from it.
 *
 * `regenerate` always rebuilds, so it always draws — recorded as dispatched
 * whichever way the submit answers.
 *
 * The bound runs in the caller's favour: work Orbit both starts and finishes
 * inside the submit window settles here as a no-op. A vendor claim on the
 * snapshot closes it exactly.
 */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person Profile",
        summary: "Build one person's profile to partial or full depth.",
        description: "Build a person's Orbit profile deeper, and get the " +
            "finished profile back. `partial` produces a useful profile in " +
            "seconds. `full` produces the deepest profile Orbit can build — " +
            "web, social and public-record research pulled together into " +
            "attributed sections on the person's background, interests and " +
            "recent activity — and takes minutes. `regenerate` forces " +
            "fresh work that CAN REPLACE facts already on the profile, so " +
            "reach for it only when a refresh is what was asked for. Takes " +
            "an Orbit " +
            "profile id, alias id, or public slug; `orbit#v3/search` finds " +
            "one from a name, an email, a phone number or a description. " +
            "Reach for this when an agent already knows who the person is " +
            "and wants more depth than the stored profile carries; " +
            "`orbit#v3/profile/{profile_id}` reads what is already there " +
            "for 1 credit. A profile already at the depth you asked for " +
            "returns as it stands and costs nothing. Otherwise 5 credits " +
            "for `partial`, 10 for `full` and `regenerate`.",
        docsUrl: "https://docs.orbitsearch.com/api/enrich/enrich-profile",
        categories: ["people-enrichment"],
    },
    request: { method: "POST", path: "/v3/enrich/{profile_id}" },
    input: {
        schema: {
            pathParams: zEnrichPathParams,
            body: zEnrichBody.extend({
                include_profile: zEnrichBody.shape.include_profile.unwrap()
                    .default(true),
            }),
        },
    },
    /** A full build researches live sources; 15 minutes is the whole-run
     *  budget that work lives inside. */
    timeouts: { requestMs: 60_000, runMs: 900_000, pollMs: 5_000 },
    lifecycle: {
        state: z.strictObject({
            dispatched: z.boolean().describe(
                "Whether Orbit started building — the signal that separates " +
                    "a billed build from a no-op read.",
            ),
            statusPath: z.string().optional().describe(
                "The status route Orbit named in `links.status`.",
            ),
        }),
        start: async ({ data, utils, logger }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":submit",
                },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const requestId = utils.json.optionalGet(res.body, "$.request_id");
            if (typeof requestId !== "string" || requestId === "") {
                throw new Error("Orbit did not return a request_id");
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            // `regenerate` rebuilds unconditionally, so it draws however the
            // submit answers.
            const rebuilding = data.input.body.operation === "regenerate";
            const link = utils.json.optionalGet(res.body, "$.links.status");
            const statusPath =
                typeof link === "string" && link.charAt(0) === "/"
                    ? link
                    : "/v3/enrich/requests/" + encodeURIComponent(requestId);
            if (status === "failed") {
                // A build that fails on the submit reports its reason at
                // `failure`, where the provider's fromError does not look —
                // lifted into Orbit's own error envelope here, exactly as
                // the poll does it, so the caller reads the reason rather
                // than the generic fallback.
                const failure = utils.json.optionalGet(res.body, "$.failure");
                const message = utils.json.optionalGet(
                    failure ?? null,
                    "$.message",
                );
                const code = utils.json.optionalGet(failure ?? null, "$.code");
                logger.warn("orbit enrich failed on submit", { requestId });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: res.status,
                    output: {
                        status: "failed",
                        error: {
                            code: typeof code === "string"
                                ? code
                                : "enrich_failed",
                            message:
                                typeof message === "string" && message !== ""
                                    ? message
                                    : "Orbit enrichment failed",
                        },
                        request_id: requestId,
                    },
                    state: {
                        externalRunId: requestId,
                        data: { dispatched: rebuilding, statusPath },
                    },
                };
            }
            if (status !== "running") {
                logger.info("orbit enrich settled on submit", {
                    requestId,
                    status: String(status),
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                    state: {
                        externalRunId: requestId,
                        data: { dispatched: rebuilding, statusPath },
                    },
                };
            }
            return {
                kind: "RUNNING",
                state: {
                    externalRunId: requestId,
                    data: { dispatched: true, statusPath },
                },
            };
        },
        poll: async ({ data, utils, logger }) => {
            const requestId = data.lifecycle.state.externalRunId;
            if (requestId === undefined) {
                throw Object.assign(
                    new Error("orbit enrich poll without externalRunId"),
                    { retriable: false },
                );
            }
            const previous = data.lifecycle.state.data;
            const res = await utils.http({
                method: "GET",
                path: previous?.statusPath ??
                    "/v3/enrich/requests/" + encodeURIComponent(requestId),
            });
            if (res.status === 408 || res.status === 429 || res.status >= 500) {
                // The status LOOKUP failed while the build keeps running and
                // keeps drawing credits. Orbit's error guide puts 429 and
                // every temporary server failure in one retry class, so the
                // whole 5xx range is held rather than a hand-picked four.
                // `Retry-After` is in SECONDS and the v3 contract asks
                // callers to honor it; an absent or malformed header falls
                // back to a fixed backoff, clamped so a bad value cannot
                // stall the run. Bounded by runMs.
                const after = Number(res.headers["retry-after"]);
                const pollAfterMs = Number.isFinite(after) && after > 0
                    ? Math.min(Math.max(after * 1000, 1_000), 120_000)
                    : 15_000;
                logger.warn("orbit enrich status lookup transient", {
                    requestId,
                    status: res.status,
                    pollAfterMs,
                });
                return { kind: "RUNNING", pollAfterMs };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "running" || status === undefined) {
                return { kind: "RUNNING" };
            }
            if (status === "failed") {
                // The BUILD failed while the status route answered 200 —
                // ours/theirs (design D12), shaped like Orbit's own error
                // envelope so one mapper reads it.
                const failure = utils.json.optionalGet(res.body, "$.failure");
                const message = utils.json.optionalGet(
                    failure ?? null,
                    "$.message",
                );
                const code = utils.json.optionalGet(failure ?? null, "$.code");
                logger.warn("orbit enrich failed", { requestId });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: 200,
                    output: {
                        status: "failed",
                        error: {
                            code: typeof code === "string"
                                ? code
                                : "enrich_failed",
                            message:
                                typeof message === "string" && message !== ""
                                    ? message
                                    : "Orbit enrichment failed",
                        },
                        request_id: requestId,
                    },
                };
            }
            logger.info("orbit enrich settled", { requestId });
            return { kind: "COMPLETED", httpStatus: 200, output: res.body };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                partial_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 5 },
                    label: "partial profile built",
                    description: "a profile built to partial depth",
                },
                full_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 10 },
                    label: "full profile built",
                    description:
                        "a profile built to full depth, or rebuilt by " +
                        "`regenerate`",
                },
            },
        },
        /** One profile, priced at the depth asked for. The ceiling assumes
         *  the build is needed; a target already at that depth settles at
         *  zero. */
        estimate: ({ data }) => ({
            counts: data.input.body.operation === "partial"
                ? { partial_profile: 1 }
                : { full_profile: 1 },
        }),
        /** Settles on the dispatch signal: the depth line is drawn only when
         *  `start` saw Orbit begin building, and only when the run reached
         *  the depth it asked for. */
        evidence: ({ data, utils }) => {
            const dispatched = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.dispatched",
            );
            const status = utils.json.optionalGet(data.output, "$.status");
            if (dispatched !== true || status !== "completed") {
                return { counts: {} };
            }
            // The REQUEST states the operation — it is required input, one
            // operation per request, and it is what Orbit priced. The
            // response echoes it, but the contract does not require that
            // echo, and a missing one would drop a 5-credit partial into the
            // 10-credit branch. `generation_level` stays the response's job:
            // it is the depth actually reached.
            const operation = data.input.body.operation;
            const level = utils.json.optionalNum(
                data.output,
                "$.generation_level",
            ) ?? 0;
            if (operation === "partial") {
                return { counts: level >= 2 ? { partial_profile: 1 } : {} };
            }
            return { counts: level >= 3 ? { full_profile: 1 } : {} };
        },
    },
});
