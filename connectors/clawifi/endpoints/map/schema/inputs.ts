import { z } from "zod";
import {
    zClawifiBrowserProfile,
    zClawifiTargetUrl,
    zClawifiTimeoutSeconds,
    zClawifiWaitUntil,
} from "../../../schema/common.ts";

/**
 * `POST /map` body: Clawifi's `MapRequest` (`clawifi/core/models.py`;
 * OpenAPI snapshot `openapi-v1.json`, Clawifi 1.7.5). Optionality only
 * (D25): `max_urls`' vendor default (100) is applied at the binding, since
 * the estimate reads it. Single-field bounds are the vendor's validators
 * (`max_urls` 1-1000, at least one source). Non-strict, like the vendor
 * model.
 */
export const zClawifiMapBody = z.object({
    url: zClawifiTargetUrl,
    search: z.string().describe(
        "Keep only URLs that contain every word of this term " +
            "(case-insensitive).",
    ).optional(),
    max_urls: z.number().int().min(1).max(1000).describe(
        "Maximum URLs to return (1-1000, vendor default 100). Billed per " +
            "started 10 URLs returned.",
    ).optional(),
    sources: z.array(
        z.enum(["robots", "sitemap", "html_links", "rss", "docs_paths"]),
    ).min(1).describe(
        "Where to discover URLs (vendor default ['sitemap', 'robots', " +
            "'html_links', 'rss']): 'robots' reads robots.txt, 'sitemap' the " +
            "sitemaps, 'html_links' the seed page's links, 'rss' feed items " +
            "from the page's RSS/Atom feeds, 'docs_paths' common " +
            "documentation paths such as /docs, /api and /changelog.",
    ).optional(),
    same_domain_only: z.boolean().describe(
        "Keep only URLs on the seed's domain (vendor default true).",
    ).optional(),
    allow_subdomains: z.boolean().describe(
        "Also keep URLs on subdomains of the seed (vendor default false).",
    ).optional(),
    robots_policy: z.enum(["respect", "ignore"]).describe(
        "Honour robots.txt disallow rules (vendor default 'respect'). Use " +
            "'ignore' only for sites you own.",
    ).optional(),
    ignore_query_params: z.boolean().describe(
        "Drop query strings from discovered URLs, so variants of one page " +
            "collapse into one (vendor default true).",
    ).optional(),
    force_browser: z.boolean().describe(
        "Load the seed page in a browser to read its links (vendor default " +
            "false).",
    ).optional(),
    browser_profile: zClawifiBrowserProfile.optional(),
    wait_until: zClawifiWaitUntil.optional(),
    timeout_seconds: zClawifiTimeoutSeconds.optional(),
});
