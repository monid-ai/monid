import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWebMapBody } from "./schema/inputs.ts";

/**
 * Mindcase `web/map`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Web Map",
        summary: "Every URL on a website in one call: sitemaps plus link " +
            "discovery, with each URL's last-modified date and where it " +
            "was found. One row per site, up to 5,000...",
        description: "Every URL on a website in one call: sitemaps plus link " +
            "discovery, with each URL's last-modified date and where it " +
            "was found. One row per site, up to 5,000 URLs, $0.002 per " +
            "site. Pass the site URLs. Returns one row per site with " +
            "site, domain, urlCount, urls, capped, fetchedAt, engine, " +
            "errorType, errorMessage. For the page content of those URLs " +
            "use mindcase#web/crawl; for one page use " +
            "mindcase#web/scrape. $0.002 per site; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/web/map",
        categories: ["web-scraping"],
    },
    endpoint: "/web/map",
    request: { method: "POST", path: "/v1/data/web/map/run" },
    input: {
        schema: {
            body: zWebMapBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.urls.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
