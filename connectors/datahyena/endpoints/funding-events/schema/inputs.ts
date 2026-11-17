import { z } from "zod";
import {
    zCountries,
    zDomain,
    zIndustryGroups,
    zListPaging,
    zNaics,
    zUsd,
    zVerticals,
} from "../../../schema/common.ts";

/** GET /funding-events query params. */
export const zFundingEventsQueryParams = z.object({
    round: z.array(z.string().min(1)).min(1).optional().describe(
        "Round labels (OR): pre-seed, seed, angel, series-a … series-g, " +
            "venture, debt, grant, private-equity and more.",
    ),
    minAmountUsd: zUsd.optional(),
    maxAmountUsd: zUsd.optional(),
    countries: zCountries.optional(),
    industryGroups: zIndustryGroups.optional(),
    verticals: zVerticals.optional(),
    naicsCode: zNaics.optional(),
    employeeBuckets: z.array(z.enum([
        "1-10",
        "11-50",
        "51-200",
        "201-500",
        "501-1000",
        "1001-5000",
        "5001-10000",
        "10001+",
    ])).min(1).optional().describe("Company headcount buckets (OR)."),
    domain: zDomain.optional(),
    companyId: z.string().min(1).optional().describe("Datahyena company id."),
    enrichedOnly: z.boolean().optional().describe(
        "Only rounds whose company carries a domain, industry, country and " +
            "description.",
    ),
    ...zListPaging,
}).strict();
