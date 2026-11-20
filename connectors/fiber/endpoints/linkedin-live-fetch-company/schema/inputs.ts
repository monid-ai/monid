import { z } from "zod";

/** Body of POST /v1/linkedin-live-fetch/company/single (companyLiveEnrich). */
export const zCompanyLiveFetchBody = z.object({
    type: z.enum(["slug", "orgId", "liUrl"]).describe(
        "What `value` holds: 'slug' (LinkedIn company slug), 'orgId' " +
            "(LinkedIn organization ID), or 'liUrl' (LinkedIn company URL).",
    ),
    value: z.string().min(1).describe(
        "The company's LinkedIn slug (e.g. 'microsoft'), LinkedIn URL (e.g. " +
            "'https://www.linkedin.com/company/microsoft'), LinkedIn " +
            "organization ID (e.g. '1441'), or Fiber company ID (e.g. " +
            "'comp_1441').",
    ),
    getHistoricalHeadcount: z.boolean().optional().describe(
        "When true, also returns total employee count over time and recent " +
            "growth trends (not a per-department breakdown). No extra cost, " +
            "but slower. Fiber default false.",
    ),
});
