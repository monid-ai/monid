import { z } from "zod";

/** `GET /api/v1/categories/validate` query — vendor mirror (D25). */
export const zCategoriesValidateQueryParams = z.strictObject({
    name: z.string().min(1).max(120).describe(
        "The term to check, e.g. 'plumbers' or 'Plumber'.",
    ),
});
