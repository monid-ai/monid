import { z } from "zod";

/**
 * `POST /search/free` body: Clawifi's `SearchFreeRequest`
 * (`clawifi/core/models.py`; OpenAPI snapshot `openapi-v1.json`, Clawifi
 * 1.7.5). Optionality only (D25): vendor defaults (`provider` "free_auto",
 * `max_results` 10) are stated in the describes, not applied here.
 * Single-field bounds are the vendor's own validators (query 1-500
 * characters after trimming, max_results 1-50, at most 20 included and 50
 * excluded domains, two-letter country/language codes).
 *
 * Non-strict, like the vendor model (unknown keys are ignored upstream).
 */
export const zClawifiSearchFreeBody = z.object({
    query: z.string().min(1).max(500).describe(
        "The search query, up to 500 characters. `site:` and `-site:` " +
            "operators work.",
    ),
    provider: z.enum([
        "free_auto",
        "searxng_local",
        "ddg_html",
        "marginalia",
        "wikipedia",
        "wikidata",
        "wayback_cdx",
        "commoncrawl",
        "hn_algolia",
        "stackexchange",
        "gdelt",
        "hf_hub",
        "tavily",
        "brave",
        "free_fused",
    ]).describe(
        "Engine plan (vendor default 'free_auto'). 'free_auto' tries the " +
            "general engines in turn and stops at the first with results; " +
            "'free_fused' asks them at once and merges rows by reciprocal " +
            "rank fusion. Name one engine to ask only it: verticals are " +
            "'hn_algolia' (Hacker News), 'stackexchange', 'gdelt' (news) and " +
            "'hf_hub' (Hugging Face models, datasets and Spaces); " +
            "'wayback_cdx' and 'commoncrawl' are archive indexes. 'tavily' " +
            "and 'brave' run only on a self-hosted Clawifi with its own " +
            "keys; hosted accounts never use them.",
    ).optional(),
    max_results: z.number().int().min(1).max(50).describe(
        "Maximum results to return (1-50, vendor default 10).",
    ).optional(),
    allow_browser_fallback: z.boolean().describe(
        "Permit a browser fallback where an engine supports one (vendor " +
            "default false); echoed back as `browser_fallback_allowed`.",
    ).optional(),
    include_domains: z.array(z.string()).max(20).describe(
        "Only return results from these domains (up to 20). Checked on " +
            "every row; an engine that cannot restrict domains is skipped.",
    ).optional(),
    exclude_domains: z.array(z.string()).max(50).describe(
        "Drop results from these domains (up to 50).",
    ).optional(),
    time_range: z.enum(["day", "week", "month", "year"]).describe(
        "Only results from the last day, week, month or year. An engine " +
            "that cannot honour it is skipped; `filters_applied` reports " +
            "what each engine did.",
    ).optional(),
    country: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "Two-letter ISO 3166-1 country code, e.g. 'us'.",
    ).optional(),
    language: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "Two-letter ISO 639-1 language code, e.g. 'en'.",
    ).optional(),
});
