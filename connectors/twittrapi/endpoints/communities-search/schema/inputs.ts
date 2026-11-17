import { z } from "zod";
import { zCount, zCursor } from "../../../schema/common.ts";

/** `GET /communities/search/{searchTerm}` path params — vendor mirror. */
export const zCommunitiesSearchPathParams = z.object({
    searchTerm: z.string().min(1).describe("Keyword, e.g. `developers`."),
}).strict();

/** `GET /communities/search/{searchTerm}` query parameters (D25). */
export const zCommunitiesSearchQueryParams = z.object({
    count: zCount.optional(),
    cursor: zCursor.optional(),
    sort: z.string().describe(
        "Sort order, passed to X as is (vendor default Relevance).",
    ).optional(),
}).strict();
