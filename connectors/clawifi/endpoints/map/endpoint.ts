import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zClawifiMapBody } from "./schema/inputs.ts";

/**
 * `POST /map` — discover a site's URLs without reading their content.
 *
 * BILLING (Clawifi `pricing.map_credits`): 1 credit per started 10 URLs
 * returned, at least 1. A leaf PER_UNIT RESULT line with `every: 10`; the
 * evidence counts `max(1, urls.length)` so the vendor's floor of one block
 * is part of the fold. `max_urls` is the limiting knob the estimate reads,
 * so the vendor default (100) is materialized at the binding (D25).
 */
export default defineEndpoint({
    meta: {
        displayName: "Clawifi Map",
        summary: "List a site's URLs from robots.txt, sitemaps, feeds and " +
            "page links.",
        description: "Discover a site's URLs before crawling or fetching. " +
            "Reads robots.txt, sitemaps, the seed page's links, RSS/Atom " +
            "feed items and common documentation paths (/docs, /api, " +
            "/reference, /changelog), and returns each URL with the source " +
            "that found it, the reason and a score. Filter it with `search`, " +
            "keep or widen the domain scope, and cap the list with " +
            "`max_urls`. robots.txt rules are respected by default. A " +
            "source that fails (for example a missing sitemap) is listed in " +
            "`errors` while the others still return URLs. Returns URLs only: " +
            "pass them to Clawifi /fetch or /scrape for content.",
        docsUrl: "https://clawifi.dev/docs",
        categories: ["web-scraping"],
        notes: [
            "1 credit per started 10 URLs returned, at least 1 (100 URLs " +
            "cost 10).",
        ],
    },
    request: { method: "POST", path: "/map" },
    input: {
        schema: {
            body: zClawifiMapBody.extend({
                max_urls: zClawifiMapBody.shape.max_urls.unwrap().default(100),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 10,
            label: "URLs returned",
            description: "per started block of 10 URLs returned, at least " +
                "one block",
            consumes: { credit: "default", amount: 1 },
        },
        /** The hold is the requested cap: `max_urls` URLs at most. */
        estimate: ({ data }) => ({
            counts: { RESULT: Math.max(1, data.input.body.max_urls) },
        }),
        evidence: ({ data, utils }) => {
            const urls = utils.json.optionalLen(data.output, "$.urls") ?? 0;
            return { counts: { RESULT: Math.max(1, urls) } };
        },
    },
});
