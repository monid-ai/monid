import { z } from "zod";
import { zGlassdoorEmployerBody } from "../../../schema/glassdoor.ts";

/**
 * `POST /glassdoor/company-reviews` request body, the vendor mirror. This
 * tool differs from its siblings: it does not cross-check the two employer
 * keys (employerId wins when both are given), and its URL needs only to
 * contain an employer id.
 */
export const zGlassdoorCompanyReviewsBody = zGlassdoorEmployerBody({
    maxReviews: z.number().int().min(1).max(100_000).optional().describe(
        "Maximum reviews to return (1-100000, and not above your plan's " +
            "limit). Vendor default 20.",
    ),
    sort: z.enum(["DATE", "RATING"]).optional().describe(
        "Review order: 'DATE' (newest first) or 'RATING'. Vendor default " +
            "'DATE'.",
    ),
    fields: z.array(z.enum([
        "*",
        "reviewId",
        "url",
        "postedAt",
        "content",
        "ratings",
        "employment",
        "engagement",
        "employer",
        "meta",
    ])).optional().describe(
        "Top-level fields to include per review. Omit for the defaults " +
            "(reviewId, url, postedAt, content, ratings, employment). Use " +
            '["*"] for every field. Does not change companyStats.',
    ),
}, "When both are given, employerId is used and the URL is ignored.");
