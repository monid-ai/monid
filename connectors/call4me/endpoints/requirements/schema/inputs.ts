import { z } from "zod";

/** `GET /api/requirements/{category}` path parameters (OpenAPI mirror). */
export const zRequirementsPathParams = z.object({
    category: z.string().min(1).describe(
        'A category slug from call4me#requirements, e.g. "restaurant", ' +
            '"medical" or "general".',
    ),
});
