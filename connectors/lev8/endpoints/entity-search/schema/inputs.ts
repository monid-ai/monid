import { z } from "zod";

/**
 * `POST /v1/entity-search/create_task` body — OpenAPI
 * `EntitySearchCreateTaskRequest` (docs.lev8.com/openapi.yaml,
 * 2026-10-16). STRICT, as Lev8's is (unknown fields answer 422). Mirror
 * carries optionality only (D25); `limit` and `enable_web_search` defaults
 * live at the binding.
 *
 * The OpenAPI's `if entity_type ∈ {xiaohongshu, wechat} then
 * enable_web_search: true` is a cross-field rule the compiled JSON Schema
 * cannot carry; it lives in the endpoint's notes (Lev8 answers 422 before
 * reserving credits, so a miss is free).
 */
export const zLev8EntitySearchBody = z.strictObject({
    entity_type: z.enum([
        "person",
        "company",
        "twitter_creator",
        "youtube_creator",
        "tiktok_creator",
        "instagram_creator",
        "shopify_store",
        "xiaohongshu",
        "wechat",
    ]).describe(
        "What to find. `wechat` = WeChat Official Accounts. " +
            "`xiaohongshu` and `wechat` require `enable_web_search: true`.",
    ),
    objective: z.string().min(1).describe(
        "Natural-language description of the entities to find, e.g. " +
            "'AI startups that raised Series A in 2024'. At most 4,000 " +
            "UTF-8 bytes after trimming.",
    ),
    limit: z.number().int().min(1).max(500).describe(
        "Maximum number of deduplicated entities to produce, 1 to 500. " +
            "Lev8 can return fewer. Each returned entity is billed.",
    ).optional(),
    enable_web_search: z.boolean().describe(
        "Also search the open web, on top of Lev8's database. Broader " +
            "and fresher (creators, Shopify stores, entities from the last " +
            "30 days) but slower and dearer: 20 startup credits instead of " +
            "5. Required `true` for `xiaohongshu` and `wechat`.",
    ).optional(),
    enrich_fields: z.array(z.string()).max(20).nullable().describe(
        "Up to 20 extra descriptive fields to return per entity under " +
            "`enrich_fields`, e.g. ['funding stage', 'headcount']. Not for " +
            "email addresses or phone numbers — use Lev8 Contact Search.",
    ).optional(),
    dedup_lev8_leads: z.array(z.string()).max(100).describe(
        "`leads_search_id`s of earlier Lev8 Entity Search runs whose " +
            "results to exclude, up to 100.",
    ).optional(),
    dedup_custom_leads: z.array(z.string()).max(1000).describe(
        "Names of leads you already have, to exclude, up to 1,000.",
    ).optional(),
});
