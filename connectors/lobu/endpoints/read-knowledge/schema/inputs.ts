import { z } from "zod";
import {
    zLobuKnowledgeSortBy,
    zLobuSortOrder,
} from "../../../schema/common.ts";

/**
 * POST /api/market/read_knowledge body, mirrored from Lobu's public
 * `read_knowledge` tool (read 2026-10-24). Optionality only (D25): numeric and
 * string bounds live at the binding.
 */
export const zLobuReadKnowledgeBody = z.object({
    query: z.string().describe(
        "Semantic and full-text search query over stored knowledge events " +
            "(Reddit posts/comments, Trustpilot reviews, and company pages).",
    ).optional(),
    content_ids: z.array(z.number().int()).describe(
        "Knowledge event IDs from returned content[].id. Exact reads can " +
            "expand each source's version history; inspect is_superseded " +
            "and pagination rather than assuming one ID returns one row.",
    ).optional(),
    entity_id: z.number().int().describe(
        "Filter knowledge events linked to a specific entity ID.",
    ).optional(),
    platforms: z.array(z.string()).describe(
        "Filter by source platform slugs, e.g. `['reddit']`, " +
            "`['trustpilot']`, `['website']`, or `['lobu']`.",
    ).optional(),
    semantic_type: z.string().describe(
        "Filter by semantic event type, e.g. `'content'` (discussions/pages) " +
            "or `'review'` (software/company reviews).",
    ).optional(),
    entity_types: z.array(z.string()).describe(
        "Filter events linked to entities of these types, e.g. " +
            "`['company', 'product']`.",
    ).optional(),
    min_similarity: z.number().describe(
        "Minimum vector similarity threshold (0.0-1.0) when `query` is set.",
    ).optional(),
    vector_weight: z.number().describe(
        "Relative weight of vector similarity vs full-text rank (0.0-1.0) " +
            "when `query` is set.",
    ).optional(),
    engagement_min: z.number().describe(
        "Minimum engagement/upvotes/score filter.",
    ).optional(),
    engagement_max: z.number().describe(
        "Maximum engagement/upvotes/score filter.",
    ).optional(),
    since: z.string().describe(
        "ISO 8601 lower bound on `occurred_at` (e.g. `'2025-01-01T00:00:00Z'`).",
    ).optional(),
    until: z.string().describe(
        "ISO 8601 upper bound on `occurred_at`.",
    ).optional(),
    sort_by: zLobuKnowledgeSortBy.describe(
        "Sort results by `'date'` or `'score'`.",
    ).optional(),
    sort_order: zLobuSortOrder.describe(
        "Sort direction: `'asc'` or `'desc'` (default: `'desc'`).",
    ).optional(),
    include_total: z.boolean().describe(
        "Whether to compute total matching count across the workspace " +
            "(default: true; pass `false` for faster pagination/search).",
    ).optional(),
    limit: z.number().int().describe(
        "Maximum number of knowledge records to return (1-100, default: 50).",
    ).optional(),
    offset: z.number().int().describe(
        "Row offset for pagination (default: 0).",
    ).optional(),
});
