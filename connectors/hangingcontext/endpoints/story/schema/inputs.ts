import { z } from "zod";

/** GET /stories/{date}/{slug}/index.json path params. Both come from a
 *  story's `url` (https://hangingcontext.com/stories/<date>/<slug>/). */
export const zHangingContextStoryPathParams = z.object({
    date: z.iso.date("Must be a calendar date in YYYY-MM-DD format")
        .describe("Story date in UTC, YYYY-MM-DD. Example: 2026-10-24."),
    slug: z.string().regex(/^[a-z0-9-]{3,80}$/).describe(
        "Story slug from the story's url. Example: " +
            "podcast-central-bank-preview-week.",
    ),
}).strict();
