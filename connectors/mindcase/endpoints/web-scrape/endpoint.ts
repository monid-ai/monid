import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWebScrapeBody } from "./schema/inputs.ts";

/**
 * Mindcase `web/scrape`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Web Scraping",
        summary: "Scrape any web page or PDF live into clean Markdown with " +
            "every link kept, plus title, description, author, published " +
            "date, word count and the cleaned HTML....",
        description:
            "Scrape any web page or PDF live into clean Markdown with " +
            "every link kept, plus title, description, author, published " +
            "date, word count and the cleaned HTML. Pages that cannot be " +
            "scraped come back with a typed error and are not charged. " +
            "Scrape a list of URLs, or search by keyword and scrape the " +
            "top results. Returns one row per page with url, query, rank, " +
            "finalUrl, statusCode, fetchStatus, title, domain, " +
            "description, snippet, author, publishedDate, language, " +
            "wordCount, markdown, html, htmlLength, meta, fetchedAt, " +
            "engine, errorType, errorMessage. Call it by url (urls) or " +
            "search (query). For a whole site rather than one page use " +
            "mindcase#web/crawl; for a site's URL list without page " +
            "content use mindcase#web/map; for named fields as JSON use " +
            "mindcase#web/extract. $0.0025 per page; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/web/scrape",
        categories: ["web-scraping"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
        ],
    },
    endpoint: "/web/scrape",
    request: { method: "POST", path: "/v1/data/web/scrape/run" },
    input: {
        schema: {
            body: zWebScrapeBody.extend({
                maxResults: zWebScrapeBody.shape.maxResults.unwrap().min(1)
                    .default(10).describe(
                        "How many search results to scrape. Defaults to 10; at most 20.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.query ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.urls?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
