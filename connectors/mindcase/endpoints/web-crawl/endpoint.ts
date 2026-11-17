import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWebCrawlBody } from "./schema/inputs.ts";

/**
 * Mindcase `web/crawl`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Web Crawl",
        summary: "Crawl a website from one start URL and get every page it " +
            "links to as clean Markdown, with title, description and link " +
            "depth. 50 pages by default, up to...",
        description:
            "Crawl a website from one start URL and get every page it " +
            "links to as clean Markdown, with title, description and link " +
            "depth. 50 pages by default, up to 1,000. Only pages that " +
            "came back are charged. Returns one row per page with url, " +
            "title, description, markdown, wordCount, depth, statusCode, " +
            "fetchedAt, engine, servedFromCache. For one page use " +
            "mindcase#web/scrape; for just the URLs, up to 5,000, much " +
            "cheaper use mindcase#web/map; for named fields as JSON use " +
            "mindcase#web/extract. $0.003 per page; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/web/crawl",
        categories: ["web-scraping"],
        notes: [
            "`maxPages` caps rows per input, so a run can return up to " +
            "that many rows for each `url` entry.",
        ],
    },
    endpoint: "/web/crawl",
    request: { method: "POST", path: "/v1/data/web/crawl/run" },
    input: {
        schema: {
            body: zWebCrawlBody.extend({
                maxPages: zWebCrawlBody.shape.maxPages.unwrap().min(1).default(
                    50,
                ).describe(
                    "How many pages to crawl. Defaults to 50; at most 1,000.",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.003 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.url.split("\n").filter((line: string) =>
                line.trim() !== ""
            ).length;
            const rows = body.maxPages * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
