import { z } from "zod";
import { zCursor, zLimit } from "../../../schema/common.ts";

/** GET /v1/entities/search — the vendor mirror (api.particle.pro/openapi.json
 *  `search-entities`, 2026-10-28). `q` is the one required input. */
export const zEntitiesSearchQueryParams = z.strictObject({
    q: z.string().min(1).describe(
        "Free-text query: a name, partial name, nickname, stock ticker, " +
            "@handle, or website domain (e.g. 'sam altman', 'coca cola', " +
            "'AAPL', '@sama', 'apple.com').",
    ),
    type: z.enum(["person", "company", "knowledge_graph_entity"]).describe(
        "Restrict results to one kind; omit to search people, companies " +
            "and knowledge-graph entities together.",
    ).optional(),
    limit: zLimit.optional(),
    cursor: zCursor.optional(),
});
