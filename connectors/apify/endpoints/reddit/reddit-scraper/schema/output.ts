import { z } from "zod";

/**
 * benthepythondev/reddit-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-10-26 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zRedditScraperOutputItem = z.object({
    "id": z.string().optional(),
    "title": z.string().optional(),
    "permalink": z.string().optional(),
    "author": z.string().optional(),
    "subreddit": z.string().optional(),
    "subreddit_id": z.string().optional(),
    "created_utc": z.string().optional(),
    "post_id": z.string().optional(),
    "parent_id": z.string().optional(),
    "body": z.string().optional(),
    "content": z.string().optional(),
    "content_format": z.string().optional(),
    "url": z.any().optional(),
    "selftext": z.any().optional(),
    "selftext_html": z.any().optional(),
    "selftext_markdown": z.any().optional(),
    "post_hint": z.any().optional(),
    "domain": z.any().optional(),
    "thumbnail": z.any().optional(),
    "link_flair_text": z.any().optional(),
    "body_html": z.any().optional(),
    "body_markdown": z.any().optional(),
    "score": z.number().int().optional(),
    "num_comments": z.number().int().optional(),
    "total_awards_received": z.number().int().optional(),
    "ups": z.number().int().optional(),
    "downs": z.number().int().optional(),
    "depth": z.number().int().optional(),
    "word_count": z.any().optional(),
    "token_count": z.any().optional(),
    "upvote_ratio": z.number().optional(),
    "is_self": z.boolean().optional(),
    "is_video": z.boolean().optional(),
    "over_18": z.boolean().optional(),
    "spoiler": z.boolean().optional(),
    "stickied": z.boolean().optional(),
    "locked": z.boolean().optional(),
    "edited": z.boolean().optional(),
    "is_submitter": z.boolean().optional(),
    "score_hidden": z.boolean().optional(),
    "images": z.array(z.object({
        "url": z.string().optional(),
        "width": z.any().optional(),
        "height": z.any().optional(),
        "caption": z.any().optional(),
    })).describe("Post images; empty when image output is disabled.")
        .optional(),
    "replies": z.array(z.record(z.string(), z.any())).describe(
        "Nested comments with the same comment and content fields; posts do not include this field.",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zRedditScraperOutput = z.array(
    zRedditScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
