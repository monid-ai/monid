import { z } from "zod";
import {
    zCountries,
    zDate,
    zDomain,
    zListPaging,
    zUsd,
} from "../../../schema/common.ts";

/** GET /investors query params. */
export const zInvestorsQueryParams = z.object({
    search: z.string().min(1).optional().describe(
        "Keyword over investor name and domain.",
    ),
    type: z.array(z.enum([
        "vc",
        "angel",
        "cvc",
        "pe",
        "growth",
        "accelerator",
        "family_office",
        "syndicate",
        "unknown",
    ])).min(1).optional().describe("Investor types (OR)."),
    countries: zCountries.optional(),
    investsIn: zCountries.optional().describe(
        "Countries of the companies they funded (OR).",
    ),
    domain: zDomain.optional().describe("Exact investor domain."),
    minRoundUsd: zUsd.optional().describe(
        "Joined at least one round of this size (whole USD).",
    ),
    minRounds: z.number().int().min(1).optional(),
    activeSince: zDate.optional().describe(
        "Latest round on or after this date.",
    ),
    hasFirmographics: z.boolean().optional(),
    ...zListPaging,
}).strict();
