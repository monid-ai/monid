import { z } from "zod";

/** GET /v1/recipes query. */
export const zRecipesQueryParams = z.object({
    url: z.string().describe(
        "Page URL to look up. Send only scheme, host and path: strip the query, the fragment, and any hosted-checkout token.",
    ).optional(),
    full: z.enum(["1"]).describe(
        "Set to `1` to return every recipe body instead of the index. Ignored when `url` is set.",
    ).optional(),
});
