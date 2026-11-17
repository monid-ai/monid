import { z } from "zod";
import { zResponseLength, zSearchDate } from "../../../schema/common.ts";

// Vendor mirror: https://docs.valyu.ai/api-reference/endpoint/search
// Defaults are left to Valyu; no pre-request fixed price is implied.
export const zValyuSearchBody = z.strictObject({
    query: z.string().describe("Natural-language search query."),
    max_num_results: z.number().int().min(1).max(20).optional()
        .describe("Result cap, default 5. Standard API limit: 20."),
    search_type: z.enum(["all", "web", "proprietary", "news"]).optional(),
    max_price: z.number().positive().optional()
        .describe(
            "Maximum CPM (cost per thousand tokens), NOT a total-dollar cap.",
        ),
    relevance_threshold: z.number().min(0).max(1).optional(),
    included_sources: z.array(z.string()).optional(),
    excluded_sources: z.array(z.string()).optional(),
    source_biases: z.record(z.string(), z.number().int().min(-5).max(5))
        .nullable().optional(),
    instructions: z.string().max(500).optional(),
    category: z.string().max(500).optional()
        .describe("Deprecated by Valyu; use instructions instead."),
    is_tool_call: z.boolean().optional(),
    response_length: zResponseLength.optional(),
    start_date: zSearchDate.optional(),
    end_date: zSearchDate.optional(),
    country_code: z.enum([
        "ALL",
        "AR",
        "AU",
        "AT",
        "BE",
        "BR",
        "CA",
        "CL",
        "DK",
        "FI",
        "FR",
        "DE",
        "HK",
        "IN",
        "ID",
        "IT",
        "JP",
        "KR",
        "MY",
        "MX",
        "NL",
        "NZ",
        "NO",
        "CN",
        "PL",
        "PT",
        "PH",
        "RU",
        "SA",
        "ZA",
        "ES",
        "SE",
        "CH",
        "TW",
        "TR",
        "GB",
        "US",
    ]).optional(),
    fast_mode: z.boolean().optional()
        .describe(
            "Lower latency, web-only; incompatible with proprietary search.",
        ),
    url_only: z.boolean().optional()
        .describe("URL-only retrieval; requires search_type web or news."),
    historical_cache: z.boolean().optional(),
    historical_cache_strict: z.enum(["off", "prefer", "only"]).optional(),
    include_abstracts: z.boolean().optional(),
});
