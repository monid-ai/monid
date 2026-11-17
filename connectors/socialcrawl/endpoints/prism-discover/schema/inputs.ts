import { z } from "zod";
import { zDryRun } from "../../../schema/list.ts";

/**
 * GET /v1/prism/discover query — tier 1 of the request table, plus the
 * tier-2 fields that change what the run spends.
 *
 * Not strict. Discover's full table is long (groups, seeds, comments.*,
 * search_in, and the rest of tier 3) and the vendor answers an unknown
 * field with a free 400 that names it. A field this schema does not
 * list still goes on the wire. A cross-field rule (a call needs a
 * subject; label=mention needs brands) is a note: `.refine` does not
 * survive compilation.
 *
 * max_credits is NOT defaulted onto the wire. Omitted, the vendor caps
 * the run at 50, and the estimate holds 50. Sending it replaces that cap.
 */
export const zPrismDiscoverQuery = z.object({
    keywords: z.string().min(1).describe(
        "Comma-separated searches. Each runs once on each platform. Up " +
            "to 6 run inside one call.",
    ).optional(),
    query: z.string().min(1).describe(
        "One search phrase. Never split on commas.",
    ).optional(),
    context: z.string().min(3).max(2000).describe(
        "What a kept row must be about: a persona or a question. 3 to " +
            "2,000 characters. Defaults to the keywords.",
    ).optional(),
    brands: z.string().min(1).describe(
        "Comma-separated brands. Each is its own group, searched by name " +
            "and labelled with the mention judgment. Alias: brand.",
    ).optional(),
    brand: z.string().min(1).describe(
        "Alias of brands.",
    ).optional(),
    platforms: z.string().min(1).describe(
        "Platforms to search, comma-separated, in order. Default is the " +
            "consumer preset.",
    ).optional(),
    preset: z.string().min(1).describe(
        "A named platform set. consumer is the default for a posts search.",
    ).optional(),
    period: z.string().min(1).describe(
        "Date window: Nd (1 to 365), yesterday, this_week, last_week, " +
            "this_month, last_month, last_quarter, this_year, or ytd.",
    ).optional(),
    since: z.string().min(1).describe(
        "Window start, YYYY-MM-DD, inclusive. Alias: from.",
    ).optional(),
    until: z.string().min(1).describe(
        "Window end, YYYY-MM-DD, inclusive. Alias: to.",
    ).optional(),
    from: z.string().min(1).describe("Alias of since.").optional(),
    to: z.string().min(1).describe("Alias of until.").optional(),
    tz: z.string().min(1).describe(
        "Time zone for period and calendar dates. Default UTC.",
    ).optional(),
    view: z.enum(["posts", "accounts", "communities", "items"]).describe(
        "What the run returns. Default posts.",
    ).optional(),
    limit: z.number().int().min(1).max(5000).describe(
        "Kept rows per group. Default 50 on a GET (20 with depth=quick). " +
            "At most 100 are answered inside one call; the rest page.",
    ).optional(),
    max_credits: z.number().int().min(1).max(10_000_000).describe(
        "The most the run may spend. Default 50 when omitted. The run " +
            "pauses at the cap and never goes past it.",
    ).optional(),
    depth: z.enum(["quick", "standard", "deep"]).describe(
        "quick searches at most 3 fast platforms and answers in about " +
            "15 seconds. deep always continues in the background. Default " +
            "standard.",
    ).optional(),
    dry_run: zDryRun.optional(),
    country: z.string().min(1).describe(
        "Keep rows or authors in this country. Also picks the news edition.",
    ).optional(),
    exclude_country: z.string().min(1).describe(
        "Drop rows or authors in these countries.",
    ).optional(),
    languages: z.string().min(1).describe(
        "Keep rows in these languages, and plan searches in them.",
    ).optional(),
    exclude_terms: z.string().min(1).describe(
        "Drop rows whose text contains one of these terms.",
    ).optional(),
    contains: z.string().min(1).describe(
        "Keep only rows containing this string or URL prefix.",
    ).optional(),
    relevance: z.enum(["filter", "score", "off"]).describe(
        "filter (default) drops off-topic rows. score keeps them with a " +
            "score. off does not judge. Judging against the keywords is free.",
    ).optional(),
    relevance_threshold: z.number().min(0).max(1).describe(
        "With relevance=filter, the lowest judgments.relevance.p to keep. " +
            "Default 0.5. Does not change the price.",
    ).optional(),
    label: z.string().min(1).describe(
        "Judgments to add: mention, intent, niche, sponsored_model, " +
            "stance, or none. Each is billed at 1 credit per started 25 " +
            "freshly judged rows. mention needs brands.",
    ).optional(),
    include: z.string().min(1).describe(
        "CSV of author_country, body, raw, instagram_views, dropped, " +
            "commenters, interest, authors, contacts, audience. Several " +
            "of these add the price of the lookup they trigger.",
    ).optional(),
    comments: z.enum(["inline", "bulk"]).describe(
        "inline reads comments under the top posts, billed at each " +
            "platform's comment-page price. bulk lists the calls and " +
            "does not read them.",
    ).optional(),
    min_views: z.number().int().min(0).optional(),
    min_likes: z.number().int().min(0).optional(),
    min_comments: z.number().int().min(0).optional(),
    min_followers: z.number().int().min(0).optional(),
    max_followers: z.number().int().min(0).optional(),
    pages_per_platform: z.number().int().min(1).describe(
        "Pages to read on each platform. More than 3 continues in the " +
            "background. Each page is billed at that platform's search price.",
    ).optional(),
    expand: z.number().int().min(0).max(3).describe(
        "Plan this many extra searches from the keywords and context. " +
            "Each extra search is billed when it returns rows.",
    ).optional(),
    async: z.union([
        z.enum(["auto", "true", "false"]),
        z.boolean(),
    ]).describe(
        "auto (default) answers in the call when the request fits, and " +
            "202 otherwise. true always continues in the background. " +
            "false returns 422 NEEDS_ASYNC instead of a 202.",
    ).optional(),
    deadline_s: z.number().int().min(1).max(96).describe(
        "Seconds a call that fits may run. Default 40, 15 with " +
            "depth=quick, at most 96.",
    ).optional(),
    posts_per_account: z.number().int().min(1).max(100).describe(
        "With view=accounts, posts to read per looked-up account. " +
            "Default 12. One call reads at most 12.",
    ).optional(),
    sites: z.string().min(1).describe(
        "Domains to search on the web source, up to 20, or auto to find " +
            "them. auto adds discovery searches.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "Page the run's stored rows. Reading them is free.",
    ).optional(),
    page_size: z.number().int().min(1).max(100).describe(
        "Rows per page when reading a run. Default 50.",
    ).optional(),
});
