import { z } from "zod";
import {
    EXACTLY_ONE_ORG,
    zOrgIdentifiers,
    zPagination,
} from "../../../schema/common.ts";

/** GET /company query params — exactly one identifier (documented rule,
 *  design D6). */
export const zCompanyQueryParams = z.object(zOrgIdentifiers).strict()
    .describe(EXACTLY_ONE_ORG);

/** GET /company/deals query params — one identifier + pagination. */
export const zCompanyDealsQueryParams = z.object({
    ...zOrgIdentifiers,
    ...zPagination,
}).strict().describe(EXACTLY_ONE_ORG);

/** GET /company/search query params — fuzzy name OR one identifier. */
export const zCompanySearchQueryParams = z.object({
    name: z.string().min(1).optional().describe(
        "Fuzzy company name search with relevance scoring.",
    ),
    domain: zOrgIdentifiers.domain,
    linkedin: zOrgIdentifiers.linkedin,
    crunchbase: zOrgIdentifiers.crunchbase,
}).strict().describe(
    "Provide EXACTLY ONE of name, domain, linkedin, crunchbase.",
);
