import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zInstantPathParams, zInstantQueryParams } from "./schema/inputs.ts";

/**
 * `GET /v1/instant/{handle}`: what the newest Pressfront trace of a name says,
 * in about a second. Answers from any trace of that name finished in the last
 * 24 hours (never says whose); a 404 `no_recent_trace` when there is none,
 * which the engine zero-bills, and the caller runs `pressfront#traces`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pressfront Instant Check",
        summary: "Who is posting about an X or Bluesky name right now, in a " +
            "second.",
        description: "Who is posting about an X or Bluesky name right now, " +
            "answered in about a second from the newest Pressfront trace of " +
            "that name in the last 24 hours. Returns the headline count " +
            "(e.g. 'Of 683 accounts: 217 strongly critical, 186 mocking, 82 " +
            "disagreeing and 39 supportive'), counts by side and tone, the " +
            "biggest voice on each side with their words and link, the post " +
            "it started from, the account whose post set off the jump, the " +
            "accounts others came through, what the critical posts claim, " +
            "the pace (growing, steady, slowing, quiet now), and `brief`: " +
            "the whole situation as Markdown facts with numbered sources, " +
            "ready for an LLM to explain. Sides are read by a language model " +
            "and labeled so. When no trace of the name exists in the window " +
            "it answers 404 `no_recent_trace` and costs nothing: run " +
            "pressfront#traces for a fresh trace (about 4 to 7 minutes).",
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
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            // $0.49 per answered check (pressfront.co/claude); a 404 bills 0
            consumes: { credit: "default", amount: 0.49 },
            label: "instant check",
        },
    },
});
