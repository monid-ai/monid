import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zTraceReadPathParams,
    zTraceReadQueryParams,
} from "./schema/inputs.ts";

/**
 * `GET /v1/traces/{id}/{part}`: one part of a finished trace. The parts are
 * Pressfront's own tabs, read as data (case, brief, story, accounts, posts,
 * timeline, groups, who, sites, evidence); accounts and posts filter and page.
 * A story (rumor) trace has case and brief; its other parts answer 422
 * `not_a_name_trace`. $0.05 per read that answers; a 409 `not_ready` (still
 * running) or any other non-2xx bills 0.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pressfront Read a Trace",
        summary: "Read one part of a finished Pressfront trace: every " +
            "account, every post, groups, timeline and more.",
        description: "Read one part of a finished Pressfront trace by its " +
            "`id`. `case`: the answer in four stops (who said it first, how " +
            "it spread, who they are, whether it happened before), each with " +
            "a link, a headline, and the numbers under it as `data`; works " +
            "for name and story traces. `accounts`: every account with its " +
            "side, followers, account age, when it first showed up, who it " +
            "came through and its first post (filter by side, " +
            "min_followers, q; sort; page with cursor). `posts`: every " +
            "post with its account, time, link, text and its own side and " +
            "tone (filter by side, since/until, words, account, threat). " +
            "`story`: what happened as data. `brief`: Markdown facts with " +
            "numbered sources (name and story traces). `timeline`: " +
            "arrivals over time, the busiest stretch, unread stretches. " +
            "`groups`: accounts that posted within minutes of each other or " +
            "the same words (measured, not proof of coordination). `who`: " +
            "where X says accounts are based, bio groups, big and press " +
            "accounts, what ChatGPT and other AIs answer about the subject. " +
            "`sites`: posts on other sites. `evidence`: saved posts, " +
            "possible threats, the block list. Sides are read by a language " +
            "model and labeled so. A story (rumor) trace has `case` and " +
            "`brief` only; the other parts answer 422 `not_a_name_trace`. A " +
            "trace still running answers 409 `not_ready`. Either costs " +
            "nothing.",
        docsUrl: "https://pressfront.co/developers",
        categories: ["twitter"],
    },
    endpoint: "/traces/{id}/{part}",
    request: { method: "GET", path: "/traces/{id}/{part}" },
    input: {
        schema: {
            pathParams: zTraceReadPathParams,
            queryParams: zTraceReadQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            // $0.05 per read that answers (pressfront.co/claude)
            consumes: { credit: "default", amount: 0.05 },
            label: "trace read",
        },
    },
});
