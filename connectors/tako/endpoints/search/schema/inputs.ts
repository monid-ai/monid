import { z } from "zod";

export const zDataSourceSettings = z.object({
    count: z.number().int().min(1).max(20).describe(
        "Maximum number of data cards to return, 1 to 20. Defaults to 5. " +
            "Fast and instant return at most 4 cards, and deep at most 8, " +
            "whatever count you send.",
    ).optional(),
    include_contents: z.boolean().describe(
        "Inline each card's underlying data in the response, billed at the " +
            "tako#v1/contents rate: $0.001 per card plus a per-row rate.",
    ).optional(),
    content_format: z.enum(["csv", "json_records", "json_compact", "card_json"])
        .describe(
            "Serialization for inlined card data: 'json_compact', " +
                "'json_records', 'csv', or 'card_json'. Defaults to " +
                "'json_compact'.",
        ).optional(),
    max_rows: z.number().int().min(1).describe(
        "Maximum rows to inline per card when include_contents is true.",
    ).optional(),
    node_ids: z.array(z.string()).max(20).describe(
        "Graph node ids to pin into the search. Pinned nodes rank first.",
    ).optional(),
    strict: z.boolean().describe(
        "When true, return only cards that match at least one node in " +
            "node_ids, which must then be non-empty.",
    ).optional(),
    variable_cost: z.boolean().optional(),
    max_variable_cost_usd: z.number().min(0).max(1_000_000).describe(
        "The most this response pays for data priced per unit, such as " +
            "website traffic and SEO data, in USD.",
    ).optional(),
}).strict();

export const zWebSourceSettings = z.object({
    count: z.number().int().min(1).max(20).describe(
        "Maximum number of web results to return, 1 to 20. Defaults to 5.",
    ).optional(),
    include_contents: z.boolean().describe(
        "Inline the page text of each web result in the response, free of " +
            "charge and best effort: a page whose text isn't available has " +
            "content.data null.",
    ).optional(),
    category: z.enum(["news", "sports", "finance"]).describe(
        "Restrict web results to a category. 'news' filters to news " +
            "sources. 'sports' and 'finance' are accepted but have no effect " +
            "yet.",
    ).optional(),
    include_domains: z.array(z.string()).max(20).describe(
        "Return only results from these domains. Send a bare host with a " +
            "top-level domain: 'cnn.com', not 'cnn'.",
    ).optional(),
    exclude_domains: z.array(z.string()).max(20).describe(
        "Drop results from these domains. Send a bare host with a " +
            "top-level domain: 'cnn.com', not 'cnn'.",
    ).optional(),
    snippet_max_chars: z.number().int().min(1).max(20_000).describe(
        "Character cap on the text excerpt returned per web result. " +
            "Defaults to 4000.",
    ).optional(),
    highlights: z.boolean().describe(
        "Return query-relevant highlight passages as each web result's " +
            "snippet, instead of the page's opening text. A page with no " +
            "highlight returns snippet null unless include_contents is also " +
            "set.",
    ).optional(),
    article_content_max_chars: z.number().int().min(1).max(1_000_000)
        .describe(
            "Character cap on the full page text when include_contents is " +
                "true. Defaults to 30000.",
        ).optional(),
    published_after: z.iso.date().describe(
        "Keep only web results published on or after this date " +
            "(YYYY-MM-DD).",
    ).optional(),
    published_before: z.iso.date().describe(
        "Keep only web results published on or before this date " +
            "(YYYY-MM-DD). Results with no known publication date are kept.",
    ).optional(),
}).strict();

export const DATA_SOURCE_DESCRIPTION =
    "Tako data source: cards from Tako's knowledge graph. The search " +
    "includes it only if present.";

export const WEB_SOURCE_DESCRIPTION =
    "Web source. The search includes it only if present.";

export const SOURCES_DESCRIPTION =
    "Per-source settings. The search includes a source only if its key " +
    "is present.";

export const zSources = z.object({
    data: zDataSourceSettings.describe(DATA_SOURCE_DESCRIPTION).optional(),
    web: zWebSourceSettings.describe(WEB_SOURCE_DESCRIPTION).optional(),
}).strict();

export const zGeoLocation = z.object({
    latitude: z.number().min(-90).max(90).describe(
        "Latitude of the end user, in degrees.",
    ),
    longitude: z.number().min(-180).max(180).describe(
        "Longitude of the end user, in degrees.",
    ),
}).strict();

export const zFlatResultsSettings = z.object({
    max_results: z.number().int().min(1).max(40).describe(
        "The number of results you want in results, 1 to 40.",
    ).optional(),
    snippet_max_chars: z.number().int().min(1).max(20_000).describe(
        "Character cap on every snippet in results.",
    ).optional(),
}).strict();

export const zOutputSettings = z.object({
    image_dark_mode: z.boolean().describe(
        "Whether to render card preview images in dark mode. Defaults to " +
            "true.",
    ).optional(),
    flat_results: zFlatResultsSettings.describe(
        "Return cards and web results as one list, results, of one shape. " +
            "Send an object to turn the mode on; an empty object uses the " +
            "defaults.",
    ).optional(),
}).strict();

export const zSearchBody = z.object({
    query: z.string().min(1).regex(/\S/).describe(
        "Natural-language search query.",
    ),
    effort: z.enum(["fast", "instant", "deep"]).describe(
        "Search effort. 'instant' serves cached cards without a new data " +
            "retrieval. 'deep' searches more of Tako's data and reranks " +
            "the results a second time; it's slower and costs $0.012 " +
            "instead of $0.007.",
    ).optional(),
    sources: zSources.describe(SOURCES_DESCRIPTION).optional(),
    location: zGeoLocation.describe(
        "Coordinates of the end user, for queries with an implicit " +
            "location such as weather.",
    ).optional(),
    country_code: z.string().describe(
        "ISO 3166-1 alpha-2 country code for localization. Defaults to " +
            "'US'.",
    ).optional(),
    locale: z.string().describe(
        "BCP-47 locale tag for language and formatting. Defaults to " +
            "'en-US'.",
    ).optional(),
    timezone: z.string().describe(
        "IANA timezone that card preview images render in, such as " +
            "'America/New_York'.",
    ).optional(),
    output_settings: zOutputSettings.describe(
        "Settings that control the response shape.",
    ).optional(),
    include_related: z.number().int().min(1).max(20).describe(
        "Return up to this many follow-up query suggestions in related. " +
            "Omit it to disable them.",
    ).optional(),
    variable_cost: z.boolean().optional(),
    zdr: z.boolean().optional(),
}).strict();
