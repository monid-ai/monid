import { z } from "zod";
import {
    glassdoorEmployerMustMatch,
    zGlassdoorEmployerBody,
} from "../../../schema/glassdoor.ts";

/** `POST /glassdoor/company-benefits` request body, the vendor mirror. */
export const zGlassdoorCompanyBenefitsBody = zGlassdoorEmployerBody({
    maxBenefitReviews: z.number().int().min(0).max(1000).optional().describe(
        "Maximum benefit reviews to return (0-1000, and not above your " +
            "plan's limit). 0 skips the benefit reviews. Vendor default 20.",
    ),
    countryId: z.number().int().positive().optional().describe(
        "Glassdoor country id to filter benefits by. Vendor default 1 " +
            "(United States).",
    ),
    fields: z.array(z.enum([
        "*",
        "overallRating",
        "totalReviews",
        "summary",
        "benefits",
        "benefitReviews",
        "countries",
        "employmentStatuses",
        "scrapedAt",
    ])).optional().describe(
        "Fields to include in the result. Omit for the defaults " +
            "(overallRating, totalReviews, summary, benefits, " +
            'benefitReviews). Use ["*"] for every field.',
    ),
}, glassdoorEmployerMustMatch);
