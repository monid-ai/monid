import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramProfilePostsQuery } from "./schema/inputs.ts";

/**
 * GET /v1/instagram/profile/posts — one page of a profile's public posts.
 *
 * 1 credit per page. include=audio holds 1 more per video filled (at most
 * 12), include=tags holds 1 more per post that names someone (at most 12),
 * and a paid label holds 4 more, refunded down to what was actually
 * judged. A cached page is free. The estimate is that ceiling, times the
 * pages the call may walk, and never above max_credits. The response's
 * credits_used settles the run.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instagram Profile Posts",
        summary: "List the public posts on an Instagram profile, newest first.",
        description: "One page of an Instagram profile's public posts, " +
            "newest first: caption, media URL, media type, like and " +
            "comment counts, and the time it was posted. Video rows carry " +
            "a view count. Share counts are not on this lane — use " +
            "instagram/profile/posts/full when you need them. Send " +
            "pagination.next_cursor back as cursor until has_more is " +
            "false. since or stop_at_id stops a daily poll at the posts " +
            "you already have, so you pay only for the pages you walk. " +
            "A collab post's author is whoever created it; the other " +
            "accounts are on post.ext.coauthors.",
        docsUrl:
            "https://www.socialcrawl.dev/platforms/instagram/profile-posts",
        categories: ["instagram"],
        notes: [
            "1 credit per page. include=audio and include=tags each add " +
            "up to 12 credits, kept only for rows that came back filled. " +
            "A paid label (mention, quality, ai_style, ai_written, " +
            "injection, or intent with offer) holds 4 more credits.",
            "label=mention does nothing, and is not billed, unless brand " +
            "is set. fit=goal does nothing unless goal is set.",
            "Send pagination.next_cursor back as cursor. next_max_id is " +
            "the same cursor under the name this endpoint's parameter " +
            "table still lists.",
            "A walk of many pages can stop on the vendor's time budget " +
            "and return a cursor. Resume with that cursor and the same " +
            "parameters.",
        ],
    },
    request: { method: "GET", path: "/v1/instagram/profile/posts" },
    input: { schema: { queryParams: zInstagramProfilePostsQuery } },
    /** One page's client budget is about 33 seconds. A max_pages walk
     *  is many pages, so the transport sits above a single page. */
    timeouts: { requestMs: 120_000, runMs: 130_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "credits",
            description: "SocialCrawl credits_used on this response. A " +
                "page lists at 1, before audio, tags, labels, and extra pages.",
        },
        /** Ceiling, not the typical page. A cache hit and every refund
         *  settle lower, on credits_used. */
        estimate: ({ data }) => {
            const q = data.input.queryParams;
            if (q.dry_run === 1) return { counts: {} };
            const include = typeof q.include === "string" ? q.include : "";
            let audio = false;
            let tags = false;
            for (const part of include.split(",")) {
                const token = part.trim();
                if (token === "audio") audio = true;
                if (token === "tags") tags = true;
            }
            let page = 1;
            if (audio) page += 12;
            if (tags) page += 12;
            const label = typeof q.label === "string" ? q.label : "";
            let paid = false;
            for (const part of label.split(",")) {
                const token = part.trim();
                if (
                    token === "quality" || token === "ai_style" ||
                    token === "ai_written" || token === "injection"
                ) paid = true;
                // mention is skipped, and not billed, unless brand is set.
                if (
                    token === "mention" && typeof q.brand === "string" &&
                    q.brand !== ""
                ) paid = true;
                if (
                    token === "intent" && typeof q.offer === "string" &&
                    q.offer !== ""
                ) paid = true;
            }
            if (paid) page += 4;
            const walking = q.max_items !== undefined ||
                q.max_credits !== undefined;
            const pages = typeof q.max_pages === "number"
                ? q.max_pages
                : walking
                ? 50
                : 1;
            let total = page * pages;
            if (typeof q.max_credits === "number" && total > q.max_credits) {
                total = q.max_credits;
            }
            return { counts: { CREDIT: total } };
        },
    },
});
