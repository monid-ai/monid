import { z } from "zod";

/**
 * POST /auth/openclaw body. Registration sends `name` (+ optional
 * `description`); a status check (credential present) sends `{}`.
 */
export const zOpenclawBody = z.object({
    name: z.string().min(1).describe(
        "Reviewer name. Required to register, ignored on a status check.",
    ).optional(),
    description: z.string().describe(
        "Short description of what the reviewer agent does.",
    ).optional(),
});
