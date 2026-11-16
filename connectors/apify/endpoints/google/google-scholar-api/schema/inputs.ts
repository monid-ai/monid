import { z } from "zod";

/**
 * johnvc/google-scholar-api — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~google-scholar-api/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zGoogleScholarApiBody = z.object({
    mode: z.enum([
        "search",
        "cite",
        "author_profile",
        "author_articles",
        "author_citation",
        "author_co_authors",
    ]).describe(
        "Which Google Scholar operation to run. Each mode uses different required fields. Defaults to 'search'.",
    ),
    q: z.string().describe(
        "Free-text query for mode=search. Supports advanced operators like author:smith or source:nature. Required for mode=search unless 'cites' or 'cluster' is provided.",
    ).optional(),
    cites: z.string().describe(
        "For mode=search only. Article identifier used to look up papers that cite this article. Combine with 'q' to search within citing papers. Mutually exclusive with 'cluster'.",
    ).optional(),
    cluster: z.string().describe(
        "For mode=search only. Article cluster identifier used to fetch all versions of a paper. Mutually exclusive with 'q' and 'cites'.",
    ).optional(),
    result_id: z.string().describe(
        "For mode=cite only. The result_id (cluster id) of the Google Scholar paper to fetch citation formats for. Obtain from an organic_results entry of mode=search.",
    ).optional(),
    author_id: z.string().describe(
        "For mode=author_profile, author_articles, author_citation, and author_co_authors. The Google Scholar author identifier (e.g., 'LSsXyncAAAAJ'). Obtain from a publication_info.authors entry of mode=search or from a Google Scholar profile URL.",
    ).optional(),
    citation_id: z.string().describe(
        "For mode=author_citation only. The citation_id of the specific article in the author's profile (obtain from articles[].citation_id of mode=author_articles).",
    ).optional(),
    hl: z.enum([
        "en",
        "es",
        "fr",
        "de",
        "it",
        "pt",
        "ja",
        "ko",
        "zh-CN",
        "zh-TW",
        "ru",
        "ar",
        "hi",
        "tr",
        "pl",
        "nl",
        "sv",
        "fi",
        "da",
        "no",
        "cs",
        "el",
        "he",
        "id",
        "ms",
        "ro",
        "th",
        "uk",
        "vi",
    ]).describe(
        "Language for the user interface and result display. Applies to all modes. Optional.",
    ).optional(),
    lr: z.string().describe(
        "For mode=search only. Restrict results to specific languages. Use 'lang_xx' codes separated by '|', e.g. 'lang_en' or 'lang_en|lang_fr'.",
    ).optional(),
    as_ylo: z.number().int().min(1900).max(2100).describe(
        "For mode=search only. Earliest publication year to include (e.g., 2010).",
    ).optional(),
    as_yhi: z.number().int().min(1900).max(2100).describe(
        "For mode=search only. Latest publication year to include (e.g., 2024).",
    ).optional(),
    scisbd: z.enum(["0", "1", "2"]).describe(
        "For mode=search only. Recency sort: 0 = relevance (default), 1 = abstracts only from the last year sorted by date, 2 = everything from the last year sorted by date.",
    ).optional(),
    as_sdt: z.enum(["0", "7", "4"]).describe(
        "For mode=search only. Controls what types of results to include. Common values: '0' exclude patents (default), '7' include patents, '4' case law (US courts).",
    ).optional(),
    safe: z.enum(["active", "off"]).describe(
        "For mode=search only. Safe search filter. Use 'active' to enable or 'off' to disable.",
    ).optional(),
    filter: z.enum(["0", "1"]).describe(
        "For mode=search only. 1 = enable the similar/omitted-results filter (default), 0 = disable it.",
    ).optional(),
    as_vis: z.enum(["0", "1"]).describe(
        "For mode=search only. 0 = include citations in results (default), 1 = exclude citations.",
    ).optional(),
    as_rr: z.enum(["0", "1"]).describe(
        "For mode=search only. 1 = restrict to review articles, 0 = all article types (default).",
    ).optional(),
    sort: z.enum(["title", "pubdate"]).describe(
        "For mode=author_profile and author_articles. 'title' sorts alphabetically, 'pubdate' sorts by publication date (newest first). Omit for the default citation-count sort.",
    ).optional(),
    max_pages: z.number().int().min(0).max(100).describe(
        "For mode=search and author_articles only. Maximum number of result pages to fetch. Use 0 for no limit. Defaults to 1.",
    ).optional(),
    num: z.number().int().min(1).max(100).describe(
        "For mode=search (1-20) and mode=author_articles (1-100). Page size for paginated modes. Defaults to 10 for search, 20 for author_articles.",
    ).optional(),
});
