import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zInstantPathParams, zInstantQueryParams } from "./schema/inputs.ts";

/**
 * `GET /v1/instant/{handle}`: who is posting about a name right now. Never an
 * empty answer:
 *   traced in the last 24 h  -> 200 in about a second, from the newest trace of
 *                               that name (any account's; never says whose)
 *   not traced               -> Pressfront searches it now (a quick trace,
 *                               about a minute) and holds the answer `wait`
 *                               seconds; still running -> 202 {status:
 *                               "searching", secondsLeft}, and the SAME call
 *                               again picks up the same search
 * ASYNC: start sends the call with `wait=20`; a 200 settles at once, a 202
 * starts polling the same URL (each poll holds 20 s) until the 200. Billed
 * $0.49 on the 200 only; a 202 is never an answer, and a failed search (502
 * `search_failed`) or any other non-2xx settles as data, zero-billed.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pressfront Instant Check",
        summary: "Who is posting about an X or Bluesky name right now: a " +
            "second if traced today, about a minute if not.",
        description: "Who is posting about an X or Bluesky name right now, " +
            "in about a second when Pressfront traced the name in the last " +
            "24 hours; otherwise Pressfront searches it right then (about a " +
            "minute: the biggest accounts and their replies) and answers. " +
            "Never empty. Returns the headline count " +
            "(e.g. 'Of 683 accounts: 217 strongly critical, 186 mocking, 82 " +
            "disagreeing and 39 supportive'), counts by side and tone, the " +
            "biggest voice on each side with their words and link, the post " +
            "it started from, the account whose post set off the jump, the " +
            "accounts others came through, what the critical posts claim, " +
            "the pace (growing, steady, slowing, quiet now), and `brief`: " +
            "the whole situation as Markdown facts with numbered sources, " +
            "ready for an LLM to explain. Sides are read by a language model " +
            "and labeled so. `depth` says quick (the minute search) or full. " +
            "For every account, run pressfront#traces (about 4 to 7 " +
            "minutes).",
        docsUrl: "https://pressfront.co/developers",
        categories: ["twitter"],
    },
    endpoint: "/instant/{handle}",
    request: { method: "GET", path: "/instant/{handle}" },
    input: {
        schema: {
            pathParams: zInstantPathParams,
            queryParams: zInstantQueryParams,
        },
    },
    // a 20 s hold per call; a fresh search takes about a minute, a slow one a few
    timeouts: { requestMs: 40_000, runMs: 360_000, pollMs: 1_000 },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            // the same call, held up to 20 s for a search still running
            const u = data.request.url;
            const url = u + (u.includes("?") ? "&" : "?") + "wait=20";
            logger.info("pressfront instant check", { url });
            const res = await utils.http({ method: "GET", url });
            if (res.status === 202) {
                return { kind: "RUNNING", state: { externalRunId: url } };
            }
            // 200 = the answer (billed); anything else is data, zero-billed
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
        poll: async ({ data, utils, logger }) => {
            const url = data.lifecycle.state.externalRunId;
            if (url === undefined) {
                throw Object.assign(
                    new Error(
                        "pressfront instant poll without its url in state",
                    ),
                    { retriable: false },
                );
            }
            const res = await utils.http({ method: "GET", url });
            if (res.status === 202) return { kind: "RUNNING" };
            if (
                res.status === 429 || res.status === 503 || res.status === 504
            ) {
                logger.warn("pressfront instant read transient", {
                    status: res.status,
                });
                return { kind: "RUNNING", pollAfterMs: 10_000 };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            // $0.49 per answered check (pressfront.co/claude); 202s and errors bill 0
            consumes: { credit: "default", amount: 0.49 },
            label: "instant check",
        },
    },
});
