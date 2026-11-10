import { z } from "zod";
import {
    zCountries,
    zDomain,
    zListPaging,
    zNaics,
} from "../../../schema/common.ts";

/** GET /exec-moves query params. */
export const zExecMovesQueryParams = z.object({
    moveType: z.array(z.enum([
        "appointment",
        "promotion",
        "departure",
        "transition",
    ])).min(1).optional().describe("Move types (OR)."),
    roleSeniority: z.array(z.enum(["c_level", "vp_level", "founder"])).min(1)
        .optional().describe("Seniority (OR)."),
    countries: zCountries.optional(),
    naicsCode: zNaics.optional(),
    domain: zDomain.optional(),
    companyId: z.string().min(1).optional().describe("Datahyena company id."),
    ...zListPaging,
}).strict();
