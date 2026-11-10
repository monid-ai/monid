import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zLobuReadKnowledgeBody } from "./schema/inputs.ts";

/**
 * POST /api/market/read_knowledge: read full untruncated community discussions,
 * software reviews, and company web pages from Lobu's public `market`
 * workspace.
 */
export default defineEndpoint({
    meta: {
        displayName: "Lobu Customer Discussions & Reviews",
        summary:
            "Search and read stored product discussions, reviews, and source pages.",
        description:
            "Find public discussions about software products and companies, " +
            "including customer complaints, alternatives, and comparisons. " +
            "Search with query (for example 'Linear pricing complaints' " +
            "or 'Notion alternatives'), or retrieve text by content_ids " +
            "returned by this endpoint. Optional filters " +
            "include entity_id, platforms, since, and until. Returns stored " +
            "source text with source_url, permalink, platform, and " +
            "occurred_at when available. Sources can include Reddit, " +
            "Trustpilot, and company web pages. This is retrieval, not a " +
            "generated comparison, exhaustive review dataset, live scrape, " +
            "or verified statement of fact. Inspect the original source " +
            "and date before citing it.",
        docsUrl: "https://app.lobu.ai/openapi.json",
        categories: ["company-reviews", "reddit"],
    },
    request: { method: "POST", path: "/api/market/read_knowledge" },
    input: {
        schema: {
            body: zLobuReadKnowledgeBody.extend({
                query: zLobuReadKnowledgeBody.shape.query.unwrap().min(1)
                    .regex(/\S/).optional(),
                content_ids: z.array(z.number().int().min(1)).min(1).max(100)
                    .optional(),
                entity_id: zLobuReadKnowledgeBody.shape.entity_id.unwrap()
                    .min(1).optional(),
                platforms: z.array(z.string().min(1).regex(/\S/)).min(1)
                    .optional(),
                semantic_type: zLobuReadKnowledgeBody.shape.semantic_type
                    .unwrap().min(1).regex(/\S/).optional(),
                entity_types: z.array(z.string().min(1).regex(/\S/)).min(1)
                    .optional(),
                min_similarity: zLobuReadKnowledgeBody.shape.min_similarity
                    .unwrap().min(0).max(1).optional(),
                vector_weight: zLobuReadKnowledgeBody.shape.vector_weight
                    .unwrap().min(0).max(1).optional(),
                since: zLobuReadKnowledgeBody.shape.since.unwrap().min(1)
                    .regex(/\S/).optional(),
                until: zLobuReadKnowledgeBody.shape.until.unwrap().min(1)
                    .regex(/\S/).optional(),
                limit: zLobuReadKnowledgeBody.shape.limit.unwrap().min(1)
                    .max(100).optional(),
                offset: zLobuReadKnowledgeBody.shape.offset.unwrap().min(0)
                    .optional(),
            }).strict(),
        },
    },
});
