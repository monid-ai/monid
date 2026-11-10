import { z } from "zod";

export const zResearchStatusPathParams = z.object({
    request_id: z.string().min(1).describe(
        "Request ID returned when research was submitted.",
    ),
});
export const zResearchStatusQueryParams = z.object({
    include_usage: z.boolean().describe(
        "Include the original job's credit receipt; reading it is not a new charge.",
    ).optional(),
});
