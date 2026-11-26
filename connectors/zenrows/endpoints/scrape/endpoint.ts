import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zScrapeQueryParams } from "./schema/inputs.ts";

/**
 * `GET https://api.zenrows.com/v1/`, one page, as content.
 *
 * `endpoint` is pinned because both Zenrows endpoints share the wire path
 * `/`, which would derive the same empty id for the pair and fail
 * `zEndpointPath` (design D22). The id is what a caller reaches for, so
 * it names what the endpoint does rather than the transport.
 *
 * MARKDOWN BY DEFAULT. The vendor returns raw HTML when `response_type`
 * is absent, and an agent that omits the format and silently receives
 * 160 KB of markup has wasted the call. So the binding defaults
 * `response_type` to `markdown` and adds `html` as this endpoint's own
 * value: the API has no `html`, and omitting the parameter is how you
 * ask for it, which is the one translation `input.toRequest` makes.
 *
 * Usage, credits and the meter relay are the provider's, inherited whole.
 * No `output` hook: monid's transport decodes a body as JSON when it
 * parses and as the raw string otherwise, and a string is valid Json, so
 * Markdown, plaintext and HTML ride through untouched. No `output.schema`
 * either: with `css_extractor` or `outputs` the body is whatever the
 * caller asked for, and a schema that cannot fail is documentation that
 * goes stale.
 */
export default defineEndpoint({
    meta: {
        displayName: "Zenrows Scrape",
        summary:
            "Fetch one page as Markdown, plaintext or HTML, or as the fields named by CSS selectors.",
        description: "Fetch a single URL through Zenrows and return its " +
            "content: Markdown by default, 'plaintext' for the text " +
            "alone, or 'html' for the page's own markup. Name CSS " +
            "selectors in 'css_extractor' to get just those fields as " +
            "JSON, or list data types in 'outputs' (emails, links, " +
            "headings, tables and the rest) to pull them out of the " +
            "page; 'outputs' needs response_type set to 'html', because " +
            "the default Markdown conversion and 'outputs' are a 400 on " +
            "the wire. Proxies, JavaScript rendering and anti-bot " +
            "handling are the vendor's job: 'mode=auto' picks the " +
            "cheapest configuration that works, or set 'js_render' and " +
            "'premium_proxy' yourself. It returns the page, not an " +
            "answer about it, and it reads one URL per call: for the " +
            "structured fields of a page, call zenrows#extract instead.",
        docsUrl: "https://docs.zenrows.com/fetch/api-reference",
        categories: ["web-scraping"],
        notes: [
            "response_type defaults to markdown here. Ask for 'html' " +
            "when you want the markup, or when you pass outputs.",
        ],
    },
    endpoint: "/scrape",
    request: { method: "GET", path: "/" },
    input: {
        schema: {
            queryParams: zScrapeQueryParams.extend({
                response_type: z.enum(["markdown", "plaintext", "html"])
                    .describe(
                        "What to return: 'markdown' (the default) for " +
                            "the page as Markdown, 'plaintext' for its " +
                            "text, 'html' for the page's own markup. " +
                            "'html' is this endpoint's own value and " +
                            "sends no response_type to the API, which " +
                            "has no such value and answers 400 for it; " +
                            "it is also the one value that lets you pass " +
                            "outputs, which the API rejects beside a " +
                            "response_type. 'pdf' is not offered here: " +
                            "it needs js_render and answers with a " +
                            "binary body.",
                    ).default("markdown"),
            }),
        },
        /** `html` is this endpoint's value, not the vendor's: the API has
         *  no such value, and sending no `response_type` at all is how it
         *  is asked for. Everything else goes through unchanged. */
        toRequest: ({ data }) => {
            const queryParams = data.input.queryParams ?? {};
            if (queryParams.response_type !== "html") return data.input;
            return {
                ...data.input,
                queryParams: Object.fromEntries(
                    Object.entries(queryParams).filter(([key]) =>
                        key !== "response_type"
                    ),
                ),
            };
        },
    },
});
