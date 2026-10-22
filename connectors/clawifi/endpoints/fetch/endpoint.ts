import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zClawifiFetchBody } from "./schema/inputs.ts";

/**
 * `POST /fetch` — one URL (page or PDF) into markdown, optionally reduced
 * to the passages that answer a question.
 *
 * BILLING (Clawifi `pricing.fetch_charge`): 0 when served from the cache; a
 * PDF 2 credits per started 50 pages read, in place of the base call; a
 * page the browser rendered 3; otherwise 1. Modeled as three metered lines
 * and NO flat line, because the engine always appends a flat line's 1 and
 * prunes a zero vendor claim: a cache hit can only settle at 0 if the
 * derived fold is 0 too.
 *   - `page` (1): a non-PDF fetch that was not a cache hit.
 *   - `browser_render` (+2): that fetch used the browser, so 3 in total.
 *   - `pdf_page` (2 per started 50): pages read of a PDF; the base call is
 *     not charged on top.
 * The vendor's `credits_charged` claim (provider `consolidate`) wins over
 * the fold; the fold is the cross-check.
 */
export default defineEndpoint({
    meta: {
        displayName: "Clawifi Fetch",
        summary: "Fetch a page or PDF as markdown, or only the passages " +
            "that answer a question.",
        description: "Fetch one URL and get its main content as markdown " +
            "with title, canonical URL, excerpt, publication and " +
            "modification dates when the page states them, and the data the " +
            "page embeds for its JavaScript (`state_json`: Next.js, Nuxt, " +
            "JSON-LD and similar). PDFs come back as markdown with page " +
            "markers and tables (`max_pages` caps the pages read; " +
            "`data.document` reports page counts and whether OCR would be " +
            "needed). Pass `query` to receive only the passages that answer " +
            "it, each with its section heading, character offsets and PDF " +
            "page, at no extra cost. A plain HTTP fetch is tried first and " +
            "the browser is used when the page needs it or `force_browser` " +
            "is set. A missing page falls back to the Wayback Machine copy " +
            "unless `skip_archive` is set. Blocked pages are diagnosed " +
            "(`diagnostics.block_type`: cloudflare, captcha, login, " +
            "not_found and others), not bypassed. Use Clawifi /scrape when " +
            "you need specific output formats such as links, metadata or " +
            "schema-shaped JSON.",
        docsUrl: "https://clawifi.dev/docs",
        categories: ["web-extraction", "web-scraping"],
        notes: [
            "1 credit per fetch, 3 when the browser rendered the page, 2 per " +
            "started 50 pages for a PDF. A fetch served from Clawifi's cache " +
            "costs 0, and several `query` calls on the same page cost one " +
            "fetch.",
            "`query` replaces `data.content_markdown` with the matching " +
            "passages; call again without `query` for the whole page.",
            "A screenshot is returned as an artifact reference (an id in " +
            "`data.artifacts`), not image bytes.",
        ],
    },
    request: { method: "POST", path: "/fetch" },
    input: {
        schema: { body: zClawifiFetchBody },
        // not exposed (see the mirror): stripped at the top level only, so
        // a nested key of the same name is never touched
        toRequest: ({ data }) => ({
            ...data.input,
            body: Object.fromEntries(
                Object.entries(data.input.body ?? {}).filter((entry) =>
                    entry[0] !== "requires_auth" &&
                    entry[0] !== "proxy_config"
                ),
            ),
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                page: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "page fetch",
                    description: "a page fetched over HTTP or in the " +
                        "browser; a cache hit is not counted",
                    consumes: { credit: "default", amount: 1 },
                },
                browser_render: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "browser render",
                    description: "surcharge when the page was rendered in " +
                        "a browser (3 credits in total)",
                    consumes: { credit: "default", amount: 2 },
                },
                pdf_page: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    every: 50,
                    label: "PDF pages read",
                    description: "2 credits per started 50 PDF pages, in " +
                        "place of the page fetch",
                    consumes: { credit: "default", amount: 2 },
                },
            },
        },
        /** The request decides the browser only through `force_browser`;
         *  whether the URL is a PDF or needs a browser on its own is the
         *  answer, so those promise 0 and the claim settles them. */
        estimate: ({ data }) => ({
            counts: {
                page: 1,
                ...(data.input.body.force_browser === true
                    ? { browser_render: 1 }
                    : {}),
            },
        }),
        /** Settle on the returned envelope, mirroring
         *  `pricing.fetch_charge`: cache hit 0, PDF by pages read, browser
         *  modes (`browser`, `session_browser`) +2, else 1. */
        evidence: ({ data, utils }) => {
            const cached = utils.json.optionalGet(data.output, "$.cache_hit");
            if (cached === true) return { counts: { page: 0 } };
            const contentType = utils.json.optionalGet(
                data.output,
                "$.data.content_type",
            );
            const document = utils.json.optionalGet(
                data.output,
                "$.data.document",
            );
            const isPdf = typeof contentType === "string" &&
                contentType.toLowerCase().startsWith("application/pdf") &&
                typeof document === "object" && document !== null &&
                !Array.isArray(document);
            if (isPdf) {
                const read = utils.json.optionalGet(document, "$.pages_read");
                const total = utils.json.optionalGet(document, "$.page_count");
                const pages = typeof read === "number" && read > 0
                    ? read
                    : typeof total === "number" && total > 0
                    ? total
                    : 1;
                return { counts: { page: 0, pdf_page: pages } };
            }
            const mode = utils.json.optionalGet(data.output, "$.mode_used");
            const rendered = mode === "browser" || mode === "session_browser";
            return {
                counts: { page: 1, ...(rendered ? { browser_render: 1 } : {}) },
            };
        },
    },
});
