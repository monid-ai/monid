import { z } from "zod";
import { enrichmentOptions } from "./common.ts";

/** Provide at least one company identifier; industry alone is insufficient. */
export const zCompanyEnrichBody = z.strictObject({
    legion_id: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    linkedin_id: z.string().nullable().optional(),
    social_url: z.string().nullable().optional(),
    ticker_symbol: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    ...enrichmentOptions,
});
