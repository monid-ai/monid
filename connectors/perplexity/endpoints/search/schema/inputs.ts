import { z } from "zod";

/**
 * Search request mirror, live-checked 2026-09-22:
 * https://docs.perplexity.ai/api-reference/search-post
 * https://docs.perplexity.ai/docs/search/quickstart
 *
 * Optionality only; defaults belong at the endpoint binding (D25).
 * The reference allows 20 languages; the quickstart says 10. Preserve
 * the reference limit here; live requests accepted 10, 11 and 20 codes.
 * Query arrays are capped at five by the quickstart, not the OpenAPI.
 * Cross-field constraints are endpoint notes, not dropped Zod refinements.
 */
export const zPerplexitySearchBody = z.object({
    query: z.union([z.string(), z.array(z.string()).max(5)]).describe(
        "Search query, or up to five queries processed independently.",
    ),
    country: z.string().length(2).describe(
        "ISO 3166-1 alpha-2 country code, for example US.",
    ).optional(),
    max_results: z.number().int().min(1).max(50).describe(
        "Maximum results: 1-20 for web, 1-50 for people; upstream default 10.",
    ).optional(),
    search_type: z.enum(["web", "people"]).describe(
        "Search mode; upstream default web.",
    ).optional(),
    search_context_size: z.enum(["low", "medium", "high"]).describe(
        "Extracted content size for web search; upstream default high. " +
            "Omit for people search: explicit low/medium/high returned HTTP " +
            "400 in live checks. Also omit with either token budget.",
    ).optional(),
    max_tokens: z.number().int().min(1).max(1_000_000).describe(
        "Maximum total extracted webpage-content tokens across results.",
    ).optional(),
    max_tokens_per_page: z.number().int().min(1).max(1_000_000).describe(
        "Maximum extracted webpage-content tokens per result page.",
    ).optional(),
    search_language_filter: z.array(z.string().length(2)).max(20).describe(
        "ISO 639-1 language codes, up to 20. Live checks accepted 20; " +
            "the quickstart's 10-code statement differs from the reference.",
    ).optional(),
    search_domain_filter: z.array(z.string().max(253)).max(20).describe(
        "Allowlist domains/paths, or prefix every entry with - for a denylist.",
    ).optional(),
    last_updated_after_filter: z.string().describe(
        "Include pages updated after this date, MM/DD/YYYY.",
    ).optional(),
    last_updated_before_filter: z.string().describe(
        "Include pages updated before this date, MM/DD/YYYY.",
    ).optional(),
    search_after_date_filter: z.string().describe(
        "Include pages published after this date, MM/DD/YYYY.",
    ).optional(),
    search_before_date_filter: z.string().describe(
        "Include pages published before this date, MM/DD/YYYY.",
    ).optional(),
    search_recency_filter: z.enum([
        "hour",
        "day",
        "week",
        "month",
        "year",
    ]).describe("Filter by publication recency.").optional(),
});
