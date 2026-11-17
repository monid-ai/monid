import { z } from "zod";

/**
 * Query fields shared by the Instagram posts and TikTok videos lists.
 * Descriptions are the vendor's, shortened to the rule a caller acts on.
 * Cross-field rules (label=mention needs brand, fit=goal needs goal)
 * cannot survive compilation and are endpoint notes.
 *
 * List pages, LinkedIn profile, and YouTube transcript document
 * `dry_run=1` only. Discover also documents `true`, so that wider
 * union stays on `zDryRun`. A boolean `true` would be sent as the
 * string "true", which the `=1` contracts do not describe.
 */
export const zDryRun = z.union([z.literal(1), z.boolean()]).describe(
    "When 1 or true, return a cost preview and charge 0 credits.",
);

/** YYYY-MM-DD, or an ISO 8601 timestamp with a timezone offset. */
const zListInstant = z.union([
    z.iso.date(),
    z.iso.datetime({ offset: true }),
]);

export const zListFilters = {
    since: zListInstant.describe(
        "Only rows published on or after this instant: YYYY-MM-DD " +
            "(midnight UTC) or an ISO 8601 timestamp. The page that " +
            "reaches an older row ends the walk. Pinned rows do not.",
    ).optional(),
    until: zListInstant.describe(
        "Only rows published on or before this instant: YYYY-MM-DD (that " +
            "whole UTC day) or an ISO 8601 timestamp. The walk does not stop.",
    ).optional(),
    stop_at_id: z.string().min(1).describe(
        "post.id or post.url of the newest row already held. The page " +
            "stops just before it and does not return a cursor. A pinned " +
            "row is never the stop.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "pagination.next_cursor from the previous page, sent back verbatim.",
    ).optional(),
    trim: z.boolean().describe(
        "Request the lighter record. On Instagram the page is normally " +
            "still served with the full fields. On TikTok the flag is " +
            "accepted and has no effect.",
    ).optional(),
    label: z.string().min(1).describe(
        "CSV of extra labels to add. sponsored, intent, and niche are " +
            "already on the page and free. mention, quality, ai_style, " +
            "ai_written, and injection, or intent together with offer, " +
            "hold 4 extra credits and refund down to what was newly judged.",
    ).optional(),
    exclude: z.string().min(1).describe(
        "CSV of engagement_bait, ai_style, ai_written. Each applies only " +
            "when the matching label was requested.",
    ).optional(),
    ai_written_threshold: z.number().min(0).max(1).describe(
        "With label=ai_written and exclude=ai_written, the p at which a " +
            "post is dropped. Default 0.95.",
    ).optional(),
    brand: z.string().min(1).max(300).describe(
        "Required by label=mention, ignored otherwise. The brand the " +
            "posts are judged against.",
    ).optional(),
    brand_description: z.string().min(1).describe(
        "Optional with label=mention. One sentence saying what the brand " +
            "is, when the name is also an ordinary word.",
    ).optional(),
    offer: z.string().min(1).max(300).describe(
        "Optional with label=intent. What you sell, in one or two " +
            "sentences. Adds fits_offer. Without it fits_offer is null.",
    ).optional(),
    judgments: z.enum(["on", "off"]).describe(
        "on (default) adds the free sponsored, intent, and niche labels. " +
            "off, like label=none, returns the page without them.",
    ).optional(),
    dry_run: z.literal(1).describe(
        "When 1, return a cost preview and charge 0 credits.",
    ).optional(),
    label_evidence: z.union([z.literal(1), z.boolean()]).describe(
        "When 1 or true, and label is set, each labelled row also carries " +
            "computed.labels_evidence.",
    ).optional(),
    fit: z.literal("goal").describe(
        "Keep the rows the goal needs and stub the rest. data.held_back " +
            "lists what was held.",
    ).optional(),
    goal: z.string().min(1).max(300).describe(
        "Required by fit=goal. What you are trying to do, in your own words.",
    ).optional(),
    fit_tokens: z.number().int().min(1).describe(
        "With fit=goal, a soft cap on how much of the page to keep, in tokens.",
    ).optional(),
    max_pages: z.number().int().min(1).max(50).describe(
        "Walk up to this many pages in one call. Default 1, or 50 when " +
            "max_items or max_credits is sent. Each page is billed as one " +
            "call; a cached page is free.",
    ).optional(),
    max_items: z.number().int().min(1).max(5000).describe(
        "Keep walking until the response holds at least this many rows. " +
            "The last page is returned whole.",
    ).optional(),
    max_credits: z.number().int().min(1).max(100_000).describe(
        "The most this call may spend across every page it walks. A value " +
            "below one page's price is a free 400.",
    ).optional(),
};
