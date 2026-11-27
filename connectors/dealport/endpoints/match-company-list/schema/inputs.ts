import { z } from "zod";
import { zDealportUuid, zUsStateCode } from "../../../schema/common.ts";

/**
 * `POST /api/v1/companies/match` JSON request body mirror
 * (https://app.dealport.com/openapi/v1.json). Optionality only; the stateless
 * matching binding in `endpoint.ts` omits the recurring `watch` fields and
 * requires either `items` or `csv`.
 */
export const zMatchCompanyListBody = z.object({
    items: z.array(
        z.object({
            external_id: z.string().min(1).describe(
                "Caller identifier echoed back on the match result row.",
            ).optional(),
            name: z.string().min(1).describe(
                "Company legal or operating name.",
            ).optional(),
            domain: z.string().min(1).describe(
                "Company website host or registrable domain.",
            ).optional(),
            city: z.string().min(1).describe(
                "Company city for fuzzy entity disambiguation.",
            ).optional(),
            state: zUsStateCode.describe(
                "Two-letter US state code for fuzzy entity disambiguation.",
            ).optional(),
        }).strict(),
    ).min(1).max(250).describe(
        "1 to 250 company rows to resolve against Dealport's 28M+ US company graph.",
    ).optional(),
    csv: z.string().min(1).describe(
        "Raw CSV text with a header row (name/company, website/domain, city, state, id).",
    ).optional(),
    watch: z.boolean().describe(
        "Add matched companies to weekly Project monitoring ($0.05/company/month).",
    ).optional(),
    project_id: zDealportUuid.describe(
        "Target Project UUID when enabling weekly monitoring.",
    ).optional(),
    project_name: z.string().min(1).describe(
        "Target Project name when enabling weekly monitoring.",
    ).optional(),
}).strict();
