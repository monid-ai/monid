import { z } from "zod";
import {
    EXACTLY_ONE_ORG,
    zOrgIdentifiers,
    zPagination,
} from "../../../schema/common.ts";

/** GET /investor query params — exactly one identifier (documented rule,
 *  design D6). */
export const zInvestorQueryParams = z.object(zOrgIdentifiers).strict()
    .describe(EXACTLY_ONE_ORG);

/** GET /investor/deals query params — one identifier + pagination. */
export const zInvestorDealsQueryParams = z.object({
    ...zOrgIdentifiers,
    ...zPagination,
}).strict().describe(EXACTLY_ONE_ORG);

/** GET /investor/search query params — fuzzy name OR one identifier. */
export const zInvestorSearchQueryParams = z.object({
    name: z.string().min(1).optional().describe(
        "Fuzzy investor name search with relevance scoring.",
    ),
    domain: zOrgIdentifiers.domain,
    linkedin: zOrgIdentifiers.linkedin,
    crunchbase: zOrgIdentifiers.crunchbase,
}).strict().describe(
    "Provide EXACTLY ONE of name, domain, linkedin, crunchbase.",
);
