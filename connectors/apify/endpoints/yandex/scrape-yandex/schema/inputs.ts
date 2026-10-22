import { z } from "zod";

/**
 * johnvc/Scrape-Yandex — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~Scrape-Yandex/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zScrapeYandexBody = z.object({
    text: z.string().describe(
        "The search term to search for on Yandex. You can use anything that you would use in a regular Yandex search.",
    ),
    include_organic_results: z.boolean().describe(
        "Return organic (non-paid) search results. Each page of organic results is delivered as its own dataset item (item_type 'organic'). Enabled by default.",
    ).optional(),
    include_ads: z.boolean().describe(
        "Return paid advertisement results when the query triggers them (typically commercial queries). Delivered as items with item_type 'ads'. Off by default.",
    ).optional(),
    include_knowledge_graph: z.boolean().describe(
        "Return the knowledge graph entity card when present (people, shows, places, brands, etc.). Delivered as items with item_type 'knowledge_graph'. Off by default.",
    ).optional(),
    include_inline_images: z.boolean().describe(
        "Return the inline image strip that can appear between organic results. Delivered as items with item_type 'inline_images'. Off by default.",
    ).optional(),
    include_inline_videos: z.boolean().describe(
        "Return the inline video carousel that can appear between organic results. Delivered as items with item_type 'inline_videos'. Off by default.",
    ).optional(),
    include_image_search: z.boolean().describe(
        "Run the same query through the dedicated Yandex Images vertical and return full image search results: original image URL, hosting page, thumbnail, and source. Each page of image results is delivered as its own dataset item (item_type 'image_search'). Supports the image filters below. Off by default.",
    ).optional(),
    include_video_search: z.boolean().describe(
        "Run the same query through the dedicated Yandex Videos vertical and return full video search results: title, link, duration, views, publish date, source platform, and channel. Each page of video results is delivered as its own dataset item (item_type 'video_search'). Supports the video filters be...",
    ).optional(),
    image_type: z.enum([
        "any",
        "photo",
        "clipart",
        "lineart",
        "demotivator",
        "face",
    ]).describe(
        "Only return images of this kind: photographs, clipart, line drawings, demotivator posters, or images with faces. 'any' (default) applies no filter.",
    ).optional(),
    image_color: z.enum([
        "any",
        "color",
        "gray",
        "red",
        "orange",
        "yellow",
        "cyan",
        "green",
        "blue",
        "violet",
        "white",
        "black",
    ]).describe(
        "Only return images dominated by this color, or by color vs. black-and-white. 'any' (default) applies no filter.",
    ).optional(),
    image_orientation: z.enum(["any", "horizontal", "vertical", "square"])
        .describe(
            "Only return images with this aspect: horizontal (landscape), vertical (portrait), or square. 'any' (default) applies no filter.",
        ).optional(),
    image_file_type: z.enum(["any", "jpg", "png", "gifan"]).describe(
        "Only return images in this file format. 'any' (default) applies no filter.",
    ).optional(),
    image_width: z.number().int().min(1).describe(
        "Only return images with exactly this pixel width. Must be set together with 'Image height'.",
    ).optional(),
    image_height: z.number().int().min(1).describe(
        "Only return images with exactly this pixel height. Must be set together with 'Image width'.",
    ).optional(),
    image_site: z.string().describe(
        "Only return images hosted on this site or domain, e.g. 'commons.wikimedia.org'. Leave blank for all sites.",
    ).optional(),
    image_recent: z.boolean().describe(
        "Only return images that appeared online within the last 7 days. Off by default.",
    ).optional(),
    video_duration: z.enum(["any", "short", "medium", "long"]).describe(
        "Only return videos of this length: short, medium, or long. 'any' (default) applies no filter.",
    ).optional(),
    video_hd: z.boolean().describe(
        "Only return high-definition videos. Off by default.",
    ).optional(),
    yandex_domain: z.enum([
        "yandex.com",
        "yandex.ru",
        "yandex.by",
        "yandex.kz",
        "yandex.uz",
        "yandex.com.tr",
    ]).describe(
        "The Yandex domain to use for search results. Defaults to 'yandex.com'. Each domain has default language and location settings. Yandex retired its other regional portals (ya.ru search, yandex.az, yandex.com.am, yandex.com.ge, yandex.co.il, yandex.md, yandex.tm, yandex.tj, yandex.eu) - to target th...",
    ).optional(),
    lang: z.enum([
        "null",
        "ru",
        "en",
        "be",
        "fr",
        "de",
        "id",
        "kk",
        "tt",
        "tr",
        "uk",
        "uz",
        "az",
        "hy",
        "lv",
        "lt",
        "et",
        "ro",
        "tk",
    ]).describe(
        "Language code for search results. Set to null for 'Unspecified'. Can use comma-separated values for multi-language (e.g., 'ru,en'). Defaults to domain language if not specified.",
    ).optional(),
    lr: z.number().int().min(1).describe(
        "Country or region ID to limit search results to a specific geographic location. If not set, the default location for the selected yandex_domain is used (e.g., 84 for yandex.com, 225 for yandex.ru). Common values: 225=Russia, 84=United States, 149=Belarus, 159=Kazakhstan, 171=Uzbekistan, 167=Azerb...",
    ).optional(),
    max_pages: z.number().int().min(0).describe(
        "Maximum number of pages to fetch (0 = no limit, default: 2 to avoid too many requests). Values above 50 are capped at 50 per run; use start_page to resume deeper results in a follow-up run (the next_start_page output field says where to resume).",
    ).optional(),
    start_page: z.number().int().min(1).describe(
        "First (1-based) result page to fetch. Use with the next_start_page value from a previous run to resume deep results across runs. Default: 1.",
    ).optional(),
    fail_on_empty_results: z.boolean().describe(
        "When enabled, a run that returns zero results because the search backend did not respond finishes as a failed run instead of succeeding with an explanatory summary item. Enable this if your monitoring keys off the run status. Default: off.",
    ).optional(),
    groups_on_page: z.number().int().min(1).max(20).describe(
        "Maximum number of search result groups (listings) returned per page. Accepts values between 1 and 20. Default is 10.",
    ).optional(),
    family_mode: z.number().int().min(0).max(2).describe(
        "Controls safe search filtering. 0 = off (no filtering), 1 = moderate (default), 2 = strict (filter explicit content).",
    ).optional(),
    fix_typo: z.boolean().describe(
        "Automatically correct spelling errors in the search query. Default is true.",
    ).optional(),
    sort_mode: z.enum(["relevance", "date"]).describe(
        "How Yandex orders the results. 'relevance' (default) ranks by relevance; 'date' ranks newest first. Applies to all selected result types.",
    ).optional(),
    period: z.enum(["all", "day", "last_two_weeks", "month"]).describe(
        "Restrict results to a recency window. 'all' (default) = no time limit; 'day' = last 24 hours; 'last_two_weeks' = last 14 days; 'month' = last 30 days. Applies to all selected result types.",
    ).optional(),
    output_file: z.string().describe(
        "Optional filename to save results. If not provided, will auto-generate based on search text and parameters.",
    ).optional(),
});
