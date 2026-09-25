import { z } from "zod";

/**
 * johnvc/naver-search-api — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~naver-search-api/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zNaverSearchApiBody = z.object({
    query: z.string().describe(
        "Enter a single search query, in Korean or any language, for example '서울 맛집' (Seoul restaurants). Provide this, `queries`, or both.",
    ).optional(),
    queries: z.array(z.string()).describe(
        "Provide a list of search queries to run in one batch (up to 100 per run). Merged with `query` and de-duplicated. Use this for bulk lookups.",
    ).optional(),
    where: z.enum(["nexearch", "web", "news", "image", "video"]).describe(
        "Choose which Naver vertical to search. 'nexearch' is the integrated results page and returns multiple blocks at once (ads, web, shopping, news). 'web', 'news', 'image', and 'video' each return a single result type and paginate further.",
    ).optional(),
    maxResultsPerQuery: z.number().int().min(1).max(300).describe(
        "How many result rows to return per query. The Actor paginates as needed, then stops early when a query runs out of results. Default 30, maximum 300.",
    ).optional(),
});
