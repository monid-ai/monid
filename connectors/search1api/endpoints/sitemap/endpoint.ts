import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSitemapBody } from "./schema/inputs.ts";

/**
 * `POST /sitemap` — one domain or URL in, its link inventory out
 * (`{links: [...]}`). Flat 1 credit per call ⇒ leaf PER_CALL.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search1API Sitemap",
        summary: "Enumerate a site's URLs from its sitemap or a full " +
            "link crawl.",
        description: "Discover the link inventory of a public site: " +
            "`type: 'sitemap'` (the default) reads the published " +
            "sitemap; `type: 'all'` enumerates every link the vendor " +
            "can reach. Returns `{links: [...]}` — feed a chosen URL " +
            "to `search1api#crawl` for its content.",
        docsUrl: "https://docs.s1.dev/api-reference/sitemap",
        categories: ["web-scraping"],
        notes: ["1 Search1API credit per call."],
    },
    request: { method: "POST", path: "/sitemap" },
    input: { schema: { body: zSitemapBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "sitemap calls",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
