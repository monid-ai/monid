import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zLinkedinPostBody } from "./schema/inputs.ts";

/** `POST /linkedin/post`: flat 2 credits per call ⇒ leaf PER_CALL. */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Post",
        summary: "Fetch one public LinkedIn post with its comments.",
        description: "Fetch one public LinkedIn post by URL and get the " +
            "post (activity id, text, created time as epoch " +
            "milliseconds, like, comment, and repost counts, and the " +
            "author's name and public identifier) and a flat list of " +
            "its comments, up to `maxComments`. Each comment carries " +
            "urn, text, created time, like and reply counts, parent " +
            "urn, and author, and `fields` trims or widens that set. " +
            "The result also has `totalComments` as LinkedIn reports " +
            "it, and `truncated` when more comments exist than were " +
            "returned. The URL must carry the post's activity id: a " +
            "/feed/update/urn:li:activity:<id> or a " +
            "/posts/<slug>-activity-<id>-<suffix> link. It reads one " +
            "post and does not search posts, read profiles or company " +
            "pages, or return private posts. For LinkedIn job listings " +
            "use `scraper#linkedin/jobs`.",
        docsUrl: "https://scraper.run/docs/linkedin/post",
        categories: ["linkedin"],
        notes: ["2 Scraper credits per call, whatever `maxComments` is."],
    },
    request: { method: "POST", path: "/linkedin/post" },
    input: { schema: { body: zLinkedinPostBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "post fetch calls",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
