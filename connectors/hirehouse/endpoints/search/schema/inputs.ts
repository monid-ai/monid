import { z } from "zod";

/** `GET /jobs/search` query parameters (hirehouse.xyz/api/public/openapi.json). */
export const zJobSearchQueryParams = z.object({
    query: z.string().max(200).optional().describe(
        "Words from the role title, skills, company or location; every word " +
            "must match. Example: 'backend engineer dubai'.",
    ),
    location: z.string().max(120).optional().describe(
        "City or country text, e.g. 'Bengaluru', 'UAE'.",
    ),
    workMode: z.enum(["remote", "onsite", "hybrid"]).optional(),
    limit: z.number().int().min(1).max(50).optional().describe(
        "Jobs per page, 1–50 (vendor default 20).",
    ),
    cursor: z.string().optional().describe(
        "The `nextCursor` of the previous page. Omit for the first page.",
    ),
}).strict();
