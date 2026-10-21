import { z } from "zod";

/** Akta POST /v1/filters/options body (agent-docs OpenAPI, 2026-10-21). */
export const zFilterOptionsBody = z.object({
    dropdowns: z.array(
        z.object({
            dropdown_type: z.string().min(1).describe(
                "A filter field name, as returned by the Filters List " +
                    "endpoint (e.g. 'firmographic.company_type').",
            ),
        }),
    ).describe(
        "Filter fields to look up. Each object has a single " +
            "`dropdown_type` key.",
    ),
});
