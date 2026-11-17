import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokProfileVideosQuery } from "./schema/inputs.ts";

/**
 * GET /v1/tiktok/profile/videos — one page of an account's public videos.
 *
 * 1 credit per page. A paid label holds 4 more and refunds down to the
 * rows newly judged, so a page costs at most 5 before a multi-page walk.
 * The estimate is that ceiling. credits_used settles the run.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Profile Videos",
        summary: "List an account's recent public TikTok videos.",
        description: "One page of a TikTok account's recent public " +
            "videos: caption, view, like, comment, share and save counts, " +
            "thumbnail, and the country TikTok registered the video to " +
            "(post.ext.region). Results stay in the source's order; " +
            "sort_by is accepted and ignored. Handle lookup still reaches " +
            "a profile behind TikTok's login or age wall. Send " +
            "pagination.next_cursor back as cursor until has_more is " +
            "false. For videos from many accounts by keyword, use a " +
            "search endpoint instead of this one.",
        docsUrl: "https://www.socialcrawl.dev/platforms/tiktok/profile-videos",
        categories: ["tiktok"],
        notes: [
            "1 credit per page. A paid label (mention, quality, " +
            "ai_style, ai_written, injection, or intent with offer) " +
            "holds 4 extra credits and refunds what was not newly judged.",
            "Send handle or user_id. The schema requires at least one of " +
            "them. A call with neither is rejected before the vendor.",
            "label=mention does nothing, and is not billed, unless brand " +
            "is set. fit=goal does nothing unless goal is set.",
            "Send pagination.next_cursor back as cursor. max_cursor is a " +
            "Unix millisecond timestamp and can also start a walk at a date.",
        ],
    },
    request: { method: "GET", path: "/v1/tiktok/profile/videos" },
    // "at least one of handle or user_id" — anyOf of required arms, so a
    // call that sends both still matches (clay D13). A `.refine` would
    // compile away.
    input: {
        schema: {
            queryParams: z.union([
                zTiktokProfileVideosQuery.required({ handle: true }),
                zTiktokProfileVideosQuery.required({ user_id: true }),
            ]).describe("Provide a handle or a user_id."),
        },
    },
    timeouts: { requestMs: 120_000, runMs: 130_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "credits",
            description: "SocialCrawl credits_used on this response. A " +
                "page lists at 1, or 5 when a paid label is held.",
        },
        estimate: ({ data }) => {
            const q = data.input.queryParams;
            if (q.dry_run === 1) return { counts: {} };
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
            const page = paid ? 5 : 1;
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
