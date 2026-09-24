import { z } from "zod";

export const queryParams = z.object({
    type: z.enum(["doc", "sheet", "slide", "canvas"]).describe(
        "Filter by document type.",
    ).optional(),
    starred: z.enum(["true", "false"]).describe(
        "Pass 'true' to return only starred documents.",
    ).optional(),
    limit: z.number().int().min(1).describe(
        "Page size. Clamped server-side to the `paginationMax` platform limit (200) — a larger value is served at the cap with `has_more` and a `next_cursor`, never rejected.",
    ).optional(),
    max_results: z.number().int().min(1).describe(
        "Alias for `limit`; clamped the same way.",
    ).optional(),
    offset: z.number().int().min(0).nullable().describe(
        "Rows to skip. Clamped server-side to the `paginationOffsetMax` platform limit; page deeper with `cursor`, which walks the whole set at constant cost.",
    ).optional(),
    cursor: z.string().describe("Opaque cursor from a prior `next_cursor`.")
        .optional(),
    fields: z.string().optional(),
    notify: z.string().optional(),
}).strict();
