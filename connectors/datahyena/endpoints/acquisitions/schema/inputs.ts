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

/** GET /acquisitions query params. */
export const zAcquisitionsQueryParams = z.object({
    paymentType: z.array(z.enum(["cash", "stock", "mixed", "undisclosed"]))
        .min(1).optional().describe("Payment types (OR)."),
    isMerger: z.boolean().optional().describe(
        "true for mergers, false for acquisitions.",
    ),
    minAmountUsd: zUsd.optional(),
    maxAmountUsd: zUsd.optional(),
    countries: zCountries.optional(),
    industryGroups: zIndustryGroups.optional(),
    verticals: zVerticals.optional(),
    naicsCode: zNaics.optional(),
    domain: zDomain.optional(),
    companyId: z.string().min(1).optional().describe(
        "Datahyena company id, as acquirer or target.",
    ),
    ...zListPaging,
}).strict();
