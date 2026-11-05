import { z } from "zod";

/** `GET /v1/traces/{id}/{part}` path parameters. */
export const zTraceReadPathParams = z.object({
    id: z.string().min(1).describe(
        "The trace id, returned as `id` by pressfront#traces.",
    ),
    part: z.enum([
        "brief",
        "story",
        "accounts",
        "posts",
        "timeline",
        "groups",
        "who",
        "sites",
        "evidence",
    ]).describe(
        "brief = Markdown facts with sources; story = what happened as data; " +
            "accounts / posts = every one, filterable and paged; timeline = " +
            "arrivals over time; groups = who moved together; who = where X " +
            "says accounts are based, bios, big and press accounts, AI " +
            "answers; sites = other sites; evidence = saved posts and threats.",
    ),
});

/** `GET /v1/traces/{id}/{part}` query parameters (each part reads the ones it uses). */
export const zTraceReadQueryParams = z.object({
    side: z.string().optional().describe(
        "accounts / posts: strongly_critical, mocking, disagreeing, " +
            "critical, supportive, neutral or not_read.",
    ),
    sort: z.string().optional().describe(
        "accounts: followers, first, touches, newest_account. posts: " +
            "oldest, newest, followers.",
    ),
    limit: z.number().int().min(1).max(200).optional().describe(
        "accounts / posts: how many, 1 to 200 (default 50).",
    ),
    cursor: z.string().optional().describe(
        "accounts / posts: the `next` value from the previous page.",
    ),
    q: z.string().optional().describe(
        "accounts: search handle, name and bio. posts: only posts with these " +
            "words.",
    ),
    since: z.string().optional().describe("posts: at or after (ISO 8601)."),
    until: z.string().optional().describe("posts: at or before (ISO 8601)."),
    account: z.string().optional().describe("posts: only this account's."),
    threat: z.boolean().optional().describe(
        "posts: true = only posts a model flagged as a possible threat.",
    ),
    min_followers: z.number().int().min(0).optional().describe(
        "accounts: only accounts with at least this many followers.",
    ),
    format: z.enum(["md", "json"]).optional().describe(
        "brief: md (Markdown text, the default) or json ({brief}).",
    ),
});
