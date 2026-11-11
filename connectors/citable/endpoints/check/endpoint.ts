import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCheckQueryParams } from "./schema/inputs.ts";

/** GET /api/check — the AI-visibility report for one page (free). */
export default defineEndpoint({
    meta: {
        displayName: "Check AI Visibility",
        summary:
            "Score a web page on whether AI answer engines can crawl, read and cite it.",
        description: "Fetches one public page the way a crawler without " +
            "JavaScript would and returns a score out of 100, a letter " +
            "grade, and one entry per check with its status, points and, " +
            "when it failed, a concrete fix. Checks cover which AI " +
            "crawlers robots.txt lets in (ChatGPT, Claude, Perplexity, " +
            "Google, Bing), whether the page can be indexed and quoted, " +
            "readable text in the server's HTML, title and description, " +
            "headings, schema.org JSON-LD, canonical, sitemap, llms.txt " +
            "and response time. A site whose bot protection refuses the " +
            "checker gets a partial report that says so. Deterministic: " +
            "the same page gives the same report. Does not run the " +
            "page's JavaScript and does not measure rankings or actual " +
            "citations; for those use a search or GEO tracking endpoint.",
        docsUrl: "https://github.com/flisk-sh/citable#api",
        categories: ["geo"],
    },
    request: { method: "GET", path: "/api/check" },
    input: { schema: { queryParams: zCheckQueryParams } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
