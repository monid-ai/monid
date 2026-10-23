import { z } from "zod";

/** The vendor reads the activity id out of the URL text and never checks
 *  the host, so only the id is enforced here. */
const activityIdPattern = /activity(?::|%3A)[0-9]+|\/posts\/.*activity-[0-9]+/;

/**
 * `POST /linkedin/post` request body: the vendor mirror, optionality only
 * (D25). The vendor schema is non-strict (it drops unknown keys); the mirror
 * stays strict so an agent's typo fails here, before the call.
 */
export const zLinkedinPostBody = z.object({
    url: z.url().regex(activityIdPattern).describe(
        "Public LinkedIn post URL. It must carry the post's activity id: " +
            "/feed/update/urn:li:activity:<id> or " +
            "/posts/<slug>-activity-<id>-<suffix>. Example: " +
            '"https://www.linkedin.com/feed/update/urn:li:activity:7443280380897562624".',
    ),
    maxComments: z.number().int().min(1).describe(
        "Maximum comments to return (positive integer; the upper bound is " +
            "your plan's, above it returns 400). Vendor default 200. The " +
            "price is 2 credits whatever this is.",
    ).optional(),
    fields: z.array(z.enum([
        "*",
        "urn",
        "text",
        "createdAt",
        "likeCount",
        "replyCount",
        "parentUrn",
        "author",
    ])).describe(
        "Fields to include per comment. Omit for the defaults (urn, text, " +
            'createdAt, likeCount, replyCount, parentUrn, author). Use ["*"] ' +
            "for every field.",
    ).optional(),
}).strict();
