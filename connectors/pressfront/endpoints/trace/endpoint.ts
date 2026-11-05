import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTraceBody } from "./schema/inputs.ts";

/**
 * `POST /v1/traces`: a fresh trace of a name, run as a durable job.
 *
 * ASYNC (design D10/D21). Pressfront's job protocol:
 *   `POST /traces`              -> 202 {id, status: "queued", etaSec} (200 + reused
 *                                  when the same name ran in the last hour)
 *   `GET  /traces/{id}?wait=20` -> holds up to 20 s, then {status, soFar?, ...};
 *                                  status queued | running | done | thin | failed
 *   `GET  /traces/{id}/story`   -> the What happened data
 *   `GET  /traces/{id}/brief?format=json` -> {brief}: Markdown facts + sources
 * The poll long-polls (`wait`), so one tick usually covers 20 s of the run.
 * On done the poll reads the story and the brief and settles them together
 * with the job `id`, which `pressfront#traces/{id}/{part}` reads further
 * (every account, every post, groups, timeline...).
 *
 * BILLING: $4.99 flat per trace that finishes (done or thin). A failed trace
 * settles as a synthesized 500 and is zero-billed. Pressfront has no cancel.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pressfront Full Trace",
        summary: "Trace who started it, who spread it and what they're " +
            "saying about an X or Bluesky name, fresh.",
        description: "Run a fresh Pressfront trace of an X or Bluesky name: " +
            "a durable job of about 4 to 7 minutes that reads everyone " +
            "posting at or about the name, polled to completion. Settles " +
            "with the job `id`, `status` (done, or thin when few accounts " +
            "answered), headline `accounts` counts by side, `story` (counts " +
            "by side and tone, the biggest voice on each side, how it " +
            "started, the jump, who carried it, claims, concentration, pace, " +
            "every measured fact) and `brief` (the whole situation as " +
            "Markdown facts with numbered sources, for an LLM to explain). " +
            "Read any part further with pressfront#traces/{id}/{part} using " +
            "the `id`. Use pressfront#instant/{handle} first: it answers in " +
            "a second when the name was traced in the last 24 hours. The " +
            "same name started again within an hour returns that trace.",
        docsUrl: "https://pressfront.co/developers",
        categories: ["twitter"],
    },
    request: { method: "POST", path: "/traces" },
    input: { schema: { body: zTraceBody } },
    // a few-minute job: the poll long-polls 20 s per tick, so requestMs > 20 s
    timeouts: { requestMs: 40_000, runMs: 1_200_000, pollMs: 2_000 },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            logger.info("starting pressfront trace", { url: data.request.url });
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                // bad name, rate limit, daily cap: DATA, zero-billed
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const jobId = utils.json.optionalGet(res.body, "$.id");
            if (typeof jobId !== "string" || jobId === "") {
                throw new Error("Pressfront did not return a trace id");
            }
            return { kind: "RUNNING", state: { externalRunId: jobId } };
        },
        poll: async ({ data, utils, logger }) => {
            const jobId = data.lifecycle.state.externalRunId;
            if (jobId === undefined) {
                throw Object.assign(
                    new Error("pressfront poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const traceUrl = data.request.url + "/" + encodeURIComponent(jobId);
            const res = await utils.http({
                method: "GET",
                url: traceUrl + "?wait=20",
            });
            if (
                res.status === 429 || res.status === 500 ||
                res.status === 502 || res.status === 503 || res.status === 504
            ) {
                // the status READ failed, not the trace: keep polling
                logger.warn("pressfront status read transient", {
                    jobId,
                    status: res.status,
                });
                return { kind: "RUNNING", pollAfterMs: 15_000 };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "queued" || status === "running") {
                return { kind: "RUNNING" };
            }
            if (status !== "done" && status !== "thin") {
                logger.warn("pressfront trace did not finish", {
                    jobId,
                    status: String(status),
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: 200,
                    output: {
                        error: "trace_" + String(status),
                        message: "The Pressfront trace " + String(status) +
                            "; nothing is charged. Start it again.",
                    },
                };
            }
            // finished: the story and the brief ride the settle with the id
            const story = await utils.http({
                method: "GET",
                url: traceUrl + "/story",
            });
            const brief = await utils.http({
                method: "GET",
                url: traceUrl + "/brief?format=json",
            });
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: utils.json.merge(res.body, {
                    id: jobId,
                    story: story.status === 200 ? story.body : null,
                    brief: brief.status === 200
                        ? utils.json.optionalGet(brief.body, "$.brief") ?? null
                        : null,
                }),
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            // $4.99 per finished trace (pressfront.co/claude)
            consumes: { credit: "default", amount: 4.99 },
            label: "full trace",
        },
    },
});
