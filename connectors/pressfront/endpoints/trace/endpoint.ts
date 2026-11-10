import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTraceBody } from "./schema/inputs.ts";

/**
 * `POST /v1/traces`: a fresh trace, run as a durable job. Three ways in,
 * exactly one per call: `{name}` (an X or Bluesky name), `{claim}` (a story
 * going around: a rumor trace) or `{text, files?}` (the situation in the
 * caller's own words, which Pressfront reads first and turns into a name or a
 * rumor trace; the 202 then carries `understood`).
 *
 * ASYNC (design D10/D21). Pressfront's job protocol:
 *   `POST /traces`              -> 202 {id, status: "queued", kind, query,
 *                                  etaSec} (200 + reused when the same name or
 *                                  story ran in the last hour)
 *   `GET  /traces/{id}?wait=20` -> holds up to 20 s, then {status, kind,
 *                                  soFar?, ...}; status queued | running |
 *                                  done | thin | failed; kind target (a name)
 *                                  or origin (a story)
 *   `GET  /traces/{id}/case`    -> the answer card: who said it first, how it
 *                                  spread, who they are, whether it happened
 *                                  before (name AND story traces)
 *   `GET  /traces/{id}/story`   -> the What happened data (name traces only:
 *                                  a story trace answers 422, so it is skipped)
 *   `GET  /traces/{id}/brief?format=json` -> {brief}: Markdown facts + sources
 * The poll long-polls (`wait`), so one tick usually covers 20 s of the run.
 * On done the poll reads the case, the story and the brief and settles them
 * together with the job `id`, which `pressfront#traces/{id}/{part}` reads
 * further (every account, every post, groups, timeline...).
 *
 * BILLING: $4.99 flat per trace that finishes (done or thin). A failed trace
 * settles as a synthesized 500 and is zero-billed. Pressfront has no cancel.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pressfront Full Trace",
        summary: "Who started it, who spread it, what they're saying: " +
            "trace a name, a story going around, or the situation in your " +
            "own words, fresh.",
        description: "Run a fresh Pressfront trace: a durable job of about " +
            "4 to 7 minutes, polled to completion. Send exactly one of " +
            "`name` (an X or Bluesky handle: reads everyone posting at or " +
            "about it), `claim` (a story going around, in a few words: finds " +
            "the earliest public post we can, how it spread and who carried " +
            "it) or `text` (the situation in your own words, optionally " +
            "with screenshots or PDFs as `files`: Pressfront reads it as a " +
            "name or a story first and says what it understood). Settles " +
            "with the job `id`, `status` (done, or thin when few accounts " +
            "answered), `kind` (target for a name, origin for a story), " +
            "`case` (the answer in four stops: who said it first, how it " +
            "spread, who they are, whether it happened before; a headline, " +
            "a link per stop, and the numbers under it as `data`), `story` " +
            "(name traces: counts by side and tone, the biggest voice on " +
            "each side, the jump, who carried it, claims, pace; null for a " +
            "story trace) and `brief` (the whole situation as Markdown facts " +
            "with numbered sources, for an LLM to explain). It reports what " +
            "people posted; it never decides who is right or whether a " +
            "story is true. Read any part further with " +
            "pressfront#traces/{id}/{part} using the `id`. For a name, try " +
            "pressfront#instant/{handle} first: it answers in a second when " +
            "the name was traced in the last 24 hours. The same name or " +
            "story started again within an hour returns that trace.",
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
                // bad name or claim, unclear text, rate limit, daily cap:
                // DATA, zero-billed
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
            // finished: the case, the story and the brief ride the settle
            // with the id. A story (origin) trace has no story tab (Pressfront
            // answers 422 there), so it is not read and settles as null.
            const kind = utils.json.optionalGet(res.body, "$.kind");
            const card = await utils.http({
                method: "GET",
                url: traceUrl + "/case",
            });
            const story = kind === "origin" ? null : await utils.http({
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
                    case: card.status === 200 ? card.body : null,
                    story: story !== null && story.status === 200
                        ? story.body
                        : null,
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
