import { defineProvider, presets } from "@shared/core";

/**
 * apimodels (apimodels.app) — one API key for image and video generation
 * models, served through two task endpoints that share one contract:
 *
 *   POST /v1/images/generations | /v1/video/generations  {model, ...}
 *     → {code: 200, msg, data: {taskId, state: "pending", model, ...}}
 *   GET  <same path>?task_id=<taskId>
 *     → {code: 200, msg, data: {taskId, state, resultUrls, credits,
 *        currency: "USD", failCode, failMsg, ...}}
 *
 * The model is selected by the `model` body field, so every endpoint here
 * pins its model in `input.toRequest` and declares an `endpoint` id (the
 * native path is shared by all of them). Polling goes back to the SAME path
 * the task was created on (`data.request.url`), so one lifecycle serves
 * images and video alike and the fns intern to one fnTable entry each.
 *
 * Billing: a completed task reports `credits` = the US dollars actually
 * deducted for it (`currency: "USD"`); failed tasks report 0 and are never
 * charged. That receipt is the vendor's claim (D27) — it wins over the
 * derived fold, which prices each endpoint at the public list rate.
 */
export default defineProvider({
    name: "apimodels",
    meta: {
        displayName: "apimodels",
        summary:
            "Image and video generation (GPT Image 2, Nano Banana, Veo 3.1, Seedance 2.0) behind one API key, with automatic retry and channel fallback.",
        description: "apimodels (apimodels.app) is a multi-model API " +
            "gateway: one API key reaches image, video, speech and language " +
            "models. This connector exposes its image and video generation " +
            "endpoints. Every job is an asynchronous task: when an upstream " +
            "errors, rate-limits or times out, the task is retried and, for " +
            "models served by more than one channel, moved to another " +
            "channel for the same model, keeping the same task id. A task " +
            "that still fails " +
            "is not charged. Completed tasks report the exact US-dollar " +
            "amount charged. Limits: results are links kept for 30 days, " +
            "content-policy refusals fail the run, and generation takes " +
            "seconds (images) to minutes (video).",
        homepageUrl: "https://apimodels.app",
        docsUrl: "https://apimodels.app/docs",
        categories: ["image-generation", "video-generation"],
        /** Caveats true of EVERY apimodels endpoint. Endpoint notes
         *  concatenate after these. */
        notes: [
            "Generation is asynchronous: the run creates a task and polls " +
            "it — images usually finish in 10-60 seconds, videos in 1-5 " +
            "minutes.",
            "Results are returned as resultUrls links that are kept for 30 " +
            "days — download anything you need to keep.",
            "Failed tasks are not charged. Upstream errors are retried " +
            "automatically, and moved to another channel when the model " +
            "has more than one; only a task that still fails comes back " +
            "as a failure.",
            "Content-policy refusals fail the run (failCode " +
            "CONTENT_MODERATION) and are not charged.",
            "Reference media must be public https:// URLs that apimodels " +
            "can fetch server-side.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.apimodels.app" },
    // 60 s per HTTP call; images finish well inside 20 minutes, video
    // endpoints override the run budget.
    timeouts: { requestMs: 60_000, runMs: 1_200_000, pollMs: 5_000 },
    lifecycle: {
        start: async ({ utils, logger }) => {
            // the default relay: the endpoint's compiled request with the
            // post-toRequest body (model pinned there)
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                // validation (400), unknown or retired model (400/410),
                // insufficient balance (402) — no task was created, nothing
                // is charged: DATA.
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            // apimodels' envelope: `code: 200` is the only success.
            const code = utils.json.optionalNum(res.body, "$.code");
            if (code !== 200) {
                logger.warn(
                    "apimodels create answered 2xx with a non-200 code — synthesizing 502",
                    { code: code ?? null },
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            const taskId = utils.json.optionalGet(res.body, "$.data.taskId");
            if (typeof taskId !== "string" || taskId === "") {
                throw Object.assign(
                    new Error("apimodels create returned no taskId"),
                    { retriable: false },
                );
            }
            logger.debug("apimodels task created", { taskId });
            return {
                kind: "RUNNING",
                state: { externalRunId: taskId, stage: "pending" },
            };
        },
        poll: async ({ data, utils, logger }) => {
            const taskId = data.lifecycle.state.externalRunId;
            if (taskId === undefined) {
                throw Object.assign(
                    new Error("apimodels poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            // poll the path the task was created on (images or video)
            const res = await utils.http({
                method: "GET",
                url: data.request.url,
                queryParams: { task_id: taskId },
            });
            if (res.status < 200 || res.status >= 300) {
                // our GET failed while the task is very likely still
                // generating: throw (retriable) rather than abandon it.
                throw new Error(
                    "apimodels task query returned " + String(res.status),
                );
            }
            const task = utils.json.optionalGet(res.body, "$.data");
            if (
                task === undefined || task === null ||
                typeof task !== "object" || Array.isArray(task)
            ) {
                throw new Error(
                    "apimodels task query returned no task for " + taskId,
                );
            }
            const state = utils.json.optionalGet(task, "$.state");
            if (state === "failed") {
                // caller-side causes keep a caller-side status; everything
                // else is a provider failure. Never charged either way.
                const failCode = utils.json.optionalGet(task, "$.failCode");
                const httpStatus = failCode === "CONTENT_MODERATION"
                    ? 422
                    : failCode === "INVALID_INPUT"
                    ? 400
                    : failCode === "INSUFFICIENT_BALANCE" ||
                            failCode === "INSUFFICIENT_CREDITS"
                    ? 402
                    : 500;
                logger.warn("apimodels task failed", {
                    taskId,
                    failCode: typeof failCode === "string" ? failCode : null,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus,
                    providerHttpStatus: res.status,
                    output: task,
                };
            }
            if (state !== "completed") {
                // pending | processing — or a state we do not know, which is
                // still in flight, never a success
                return {
                    kind: "RUNNING",
                    state: {
                        externalRunId: taskId,
                        ...(typeof state === "string" ? { stage: state } : {}),
                    },
                };
            }
            const urls = utils.json.optionalGet(task, "$.resultUrls");
            const hasResult = Array.isArray(urls) &&
                urls.some((u) => typeof u === "string" && u !== "");
            if (!hasResult) {
                logger.warn("apimodels task completed without a result url", {
                    taskId,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: task,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                providerHttpStatus: res.status,
                output: task,
            };
        },
        // no stop — a created task runs to completion
    },
    usage: {
        /** apimodels prices in US dollars off a prepaid balance, so the
         *  pool IS dollars (the openai posture). */
        credits: {
            default: {
                label: "US dollars",
                description:
                    "US dollars deducted from the apimodels account balance.",
            },
        },
        /** The vendor's meter (D27): a completed task carries `credits`, the
         *  dollars actually deducted, with `currency: "USD"`. A positive
         *  USD amount is the claim; anything else claims nothing and the
         *  derived fold settles. Both receipt fields are lifted out of the
         *  payload in the same motion. */
        consolidate: ({ data, utils }) => {
            const amount = utils.json.pluck(data.output, "$.credits");
            const currency = utils.json.pluck(amount.rest, "$.currency");
            const usd = amount.value;
            const credits: Record<string, number> = typeof usd === "number" &&
                    Number.isFinite(usd) && usd > 0 &&
                    currency.value === "USD"
                ? { default: usd }
                : {};
            return { credits, output: currency.rest };
        },
    },
    output: {
        /** The task as the caller needs it: drop the account id and the
         *  JSON-string echoes of the request and raw result (resultUrls and
         *  images already carry the result). */
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, [
                "userId",
                "param",
                "resultJson",
                "modelDisplayName",
                "modelType",
            ]),
    },
});
