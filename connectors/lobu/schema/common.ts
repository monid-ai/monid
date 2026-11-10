import { z } from "zod";

/**
 * Shared schema fragments across Lobu endpoints, mirrored from
 * https://app.lobu.ai/openapi.json (read 2026-10-24).
 */

/** Sort direction for knowledge queries (`read_knowledge`). */
export const zLobuSortOrder = z.enum(["asc", "desc"]);

/** Sort axis for `read_knowledge`. */
export const zLobuKnowledgeSortBy = z.enum(["date", "score"]);
