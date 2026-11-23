import { z } from "zod";

export const zV3EventsArcsQueryParams = z.object({
    q: z.string().max(500).regex(/\S/).describe(
        "Topic to search for, up to 500 characters. Ranks by " +
            "relevance.",
    ).optional(),
    arcIds: z.array(z.guid()).min(1).max(30).describe(
        "Up to 30. An id we do not hold is skipped.",
    ).optional(),
    status: z.enum(["active", "retired"]).describe(
        "Default `active`.",
    ).optional(),
    assetClass: z.enum(["crypto", "equity"]).describe(
        "Arcs where at least 15% of the shown events name an asset in " +
            "this market, then arcs in neither market (macro news), each " +
            "group in `sort` order. Counts and recency leave out events " +
            "tagged only for the other market.",
    ).optional(),
    entityIds: z.array(z.guid()).min(1).max(30).describe(
        "Up to 30 asset family UUIDs. A person, project or " +
            "organisation is refused.",
    ).optional(),
    sort: z.enum(["latest", "storylines", "events"]).describe(
        "`latest` (newest event), `storylines` or `events` (most " +
            "first).",
    ).optional(),
    order: z.enum(["desc", "asc"]).describe(
        "`desc` (default) or `asc`.",
    ).optional(),
    limit: z.number().int().min(1).max(30).describe(
        "Default 10, maximum 30.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "`nextCursor` from the previous response.",
    ).optional(),
}).strict();
