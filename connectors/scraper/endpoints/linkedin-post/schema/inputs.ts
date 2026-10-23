import { z } from "zod";

/**
 * `POST /linkedin/post` request body: the vendor mirror, optionality only
 * (D25). The vendor schema is non-strict (it drops unknown keys); the mirror
 * stays strict so an agent's typo fails here, before the call.
 */
export const zLinkedinPostBody = z.object({
    url: z.url().describe(
        "Public LinkedIn post URL. It must carry the post's activity id: " +
            "/feed/update/urn:li:activity:<id> or " +
            "/posts/<slug>-activity-<id>-<suffix>. Example: " +
            '"https://www.linkedin.com/feed/update/urn:li:activity:7443280380897562624".',
    ),
    maxComments: z.number().int().min(1).optional().describe(
        "Maximum comments to return (positive integer; the upper bound is " +
            "your plan's, above it returns 400). Vendor default 200. The " +
            "price is 2 credits whatever this is.",
    ),
    fields: z.array(z.enum([
        "*",
        "urn",
        "text",
        "createdAt",
        "likeCount",
        "replyCount",
        "parentUrn",
        "author",
    ])).optional().describe(
        "Fields to include per comment. Omit for the defaults (urn, text, " +
            'createdAt, likeCount, replyCount, parentUrn, author). Use ["*"] ' +
            "for every field.",
    ),
}).strict();
