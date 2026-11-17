import { defineProvider } from "@shared/core";
import { z } from "zod";

/**
 * Citable (citable.flisk.si) — checks whether AI answer engines can find,
 * read and cite a web page. One synchronous GET against
 * `https://citable.flisk.si`.
 *
 * Citable is free and needs no API key, so this provider declares an EMPTY
 * credentials shape and a pass-through `auth.inject` (the request leaves as
 * built). Every endpoint is FREE: nothing is metered and no credit system is
 * declared.
 */
export default defineProvider({
    name: "citable",
    meta: {
        displayName: "Citable",
        summary: "Check whether AI answer engines can crawl, read and cite a " +
            "web page.",
        description: "Citable — a deterministic AI-visibility check for one " +
            "web page. It fetches the page the way a crawler without " +
            "JavaScript would and scores it out of 100: whether ChatGPT, " +
            "Claude, Perplexity and Google crawlers are allowed in " +
            "(robots.txt), whether the page can be indexed and quoted " +
            "(noindex, nosnippet), whether the server's HTML has readable " +
            "text, and title, description, headings, schema.org JSON-LD, " +
            "canonical, sitemap and llms.txt. Every failed check carries a " +
            "concrete fix. The same page always gets the same score.",
        homepageUrl: "https://citable.flisk.si",
        docsUrl: "https://github.com/flisk-sh/citable#api",
        categories: ["geo"],
        notes: [
            "Free and keyless: no credentials are needed, and nothing is " +
            "billed.",
            "The checker makes at most four GET requests to the target site " +
            "(the page, /robots.txt, /llms.txt and the sitemap) as " +
            "CitableBot/1.0, only to public addresses on ports 80 and 443, " +
            "within 8 seconds and 2 MB.",
            "Reports are cached for an hour; pass `fresh=1` to check again.",
        ],
    },
    auth: {
        // No secret exists. The pass-through keeps the request as built.
        inject: ({ data }) => data.request,
        credentials: z.object({}),
    },
    request: { baseUrl: "https://citable.flisk.si" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
});
