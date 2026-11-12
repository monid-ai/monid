import { z } from "zod";

export const zContentsHighlights = z.object({
    query: z.string().describe(
        "The question the passages should answer. Omit it to receive the " +
            "page's leading passages.",
    ).optional(),
    max_characters: z.number().int().min(100).max(20_000).describe(
        "Total character budget for the returned passages. Defaults to 4000.",
    ).optional(),
}).strict();

export const zContentsBody = z.object({
    url: z.string().describe(
        "The result URL to fetch content for: a card's webpage_url from " +
            "tako#v3/search, or a web page URL. A card URL returns the " +
            "card's data; any other URL returns the page's extracted text.",
    ),
    mode: z.enum(["url", "inline"]).describe(
        "Delivery mode. 'url' returns a presigned download link. 'inline' " +
            "returns the content in the response: card data up to 2,000 " +
            "rows unless max_rows asks for more. Defaults to 'url'.",
    ).optional(),
    content_format: z.enum(["csv", "json_records", "json_compact", "card_json"])
        .describe(
            "Serialization for card data: 'csv', 'json_records', " +
                "'json_compact', or 'card_json' (a card-type-specific JSON " +
                "object; not every card type supports it). Ignored for web " +
                "URLs, which always return text. Defaults to 'csv'.",
        ).optional(),
    max_rows: z.number().int().min(1).describe(
        "Maximum rows a card export returns and bills. Omit it to get the " +
            "whole card in 'url' mode, or 2,000 rows in 'inline' mode. Tako " +
            "clamps it to the card's export_pricing.max_rows_ceiling, at " +
            "most 100,000.",
    ).optional(),
    offset: z.number().int().min(0).max(100_000).describe(
        "Rows to skip before the export starts, in the card's own row " +
            "order. Use it with max_rows to export one slice of a list. " +
            "Defaults to 0.",
    ).optional(),
    max_chars: z.number().int().min(1).max(1_000_000).describe(
        "Character cap on extracted web page text. Ignored for card URLs. " +
            "Omit it for the full page text.",
    ).optional(),
    quote_only: z.boolean().describe(
        "When true, return the export's price without fetching content or " +
            "charging.",
    ).optional(),
    premium: z.boolean().describe(
        "When true, reveal premium cells, such as contact fields on a " +
            "people or company list, and bill them per record at " +
            "export_pricing.premium_row_cpm_usd. Premium cells are withheld " +
            "by default.",
    ).optional(),
    max_cost_usd: z.number().min(0).max(1_000_000).describe(
        "The most this call can cost, in USD: the export's base price, its " +
            "row charge, premium records, and per-unit data charges. Tako " +
            "prices the call before it reads any data, and returns a 422 " +
            "with error_type COST_CAP_EXCEEDED and the price in " +
            "quoted_cost_usd, unbilled, when the price is above the cap. " +
            "To get under the cap, lower max_rows or raise max_cost_usd.",
    ).optional(),
    highlights: zContentsHighlights.describe(
        "Return only the passages of a web page that match " +
            "highlights.query, instead of its full text. Card URLs reject it.",
    ).optional(),
    zdr: z.boolean().optional(),
}).strict();
