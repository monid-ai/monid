import { z } from "zod";

/**
 * leado/reddit-scraper-pro — dataset ITEM schema, derived from the actor's
 * published storages.dataset.views.overview fields on 2026-11-20.
 * Passthrough DOCUMENTATION (design D29): non-strict, every field optional —
 * output validation can never fail a paid run over vendor drift.
 */
export const zRedditScraperProOutputItem = z.object({
    type: z.any().describe("Item type ('post' or 'comment')").optional(),
    subreddit: z.any().describe("Subreddit name").optional(),
    title: z.any().describe("Post title").optional(),
    selfText: z.any().describe("Post body text").optional(),
    body: z.any().describe("Comment body text").optional(),
    author: z.any().describe("Reddit username of the author").optional(),
    score: z.any().describe("Upvotes / score").optional(),
    numComments: z.any().describe("Number of comments on the post").optional(),
    createdAt: z.any().describe("ISO timestamp of creation").optional(),
    url: z.any().describe("Direct URL to the post or comment").optional(),
    id: z.any().describe("Unique Reddit ID of the post or comment").optional(),
    postId: z.any().describe("Parent post ID (for comments)").optional(),
});

/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zRedditScraperProOutput = z.array(
    zRedditScraperProOutputItem.or(z.record(z.string(), z.unknown())),
);
