import { z } from "zod";

/** `GET /api/v1/categories` query — vendor mirror (optionality only, D25). */
export const zCategoriesQueryParams = z.strictObject({
    q: z.string().max(120).describe(
        "Substring to match against Google Maps category names, e.g. " +
            "'dent' finds 'Dentist' and 'Dental clinic'.",
    ).optional(),
    limit: z.number().int().min(1).max(100).describe(
        "Maximum categories to return. The vendor defaults to 20.",
    ).optional(),
});
