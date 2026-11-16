import { z } from "zod";

/**
 * `POST /v1/web-search` request body (https://specstream.ai/openapi.json,
 * 2026-11-14). Image search and its filters are not mirrored: an agent that
 * wants a page asks for web or news results.
 */
export const zWebSearchBody = z.object({
    q: z.string().min(1).max(2000).describe(
        "The question or the request in everyday words, in any language. " +
            "Search operators hold on every result: `site:`, `-site:`, " +
            '`-word`, `"phrase"`, `filetype:`, `after:` and `before:` ' +
            "(YYYY, YYYY-MM or YYYY-MM-DD).",
    ),
    speed: z.enum(["default", "fast"]).describe(
        "`default` answers the question: the answer or the rows, each " +
            "value with the page it came from, and the results read, in " +
            "a few seconds. `fast` returns the search results with their " +
            "snippets in about a second, with no answer, at a fifth of " +
            "the price.",
    ).optional(),
    num: z.number().int().min(1).max(100).describe(
        "The number of results to return, 1 to 100. Up to 10 are in the " +
            "base price; each started block of 10 more adds to it.",
    ).optional(),
    page: z.number().int().min(1).max(10).describe(
        "The page of results, 1 to 10. Page 2 continues the list of page " +
            "1; `next_page` in the reply names the next one.",
    ).optional(),
    passages: z.boolean().describe(
        "Also return the text of the top pages closest to the request, " +
            "each with its page, so the evidence is in the reply and no " +
            "page has to be read. Not with `speed: fast` or `news`.",
    ).optional(),
    news: z.boolean().describe(
        "News items in place of web results: newest first, each with its " +
            "publisher and its time. Priced as a fast search.",
    ).optional(),
    language: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "The language of the results, as a two-letter ISO 639-1 code " +
            "such as `de`.",
    ).optional(),
    country: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "The country the results are for, as a two-letter ISO 3166-1 " +
            "code such as `DE`.",
    ).optional(),
    safe: z.enum(["off", "moderate", "strict"]).describe(
        "The safe search level.",
    ).optional(),
});
