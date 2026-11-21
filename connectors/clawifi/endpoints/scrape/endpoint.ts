import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zClawifiScrapeBody } from "./schema/inputs.ts";

/**
 * `POST /scrape` — one URL projected into the formats the caller asks for.
 *
 * BILLING: a scrape is priced by the fetch underneath it
 * (`pricing.report_fetched_cost`), the same card as `/fetch`: 0 from the
 * cache, 3 when the browser rendered the page, otherwise 1. Same two
 * metered lines and no flat line, for the same reason (a cache hit must be
 * able to derive 0). Requesting `screenshot` or `mode: 'browser'` forces the
 * browser, so the estimate promises the surcharge for those inputs.
 *
 * NOT MODELED: PDF reading (2 per started 50 pages, in place of the base).
 * The scrape response does not carry the page count, so a PDF scrape
 * settles on the vendor's `credits_charged` claim and the fold rides out as
 * `usage.mismatch.derived`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Clawifi Scrape",
        summary: "Scrape one URL into chosen formats: markdown, text, " +
            "links, metadata, HTML or schema-shaped JSON.",
        description: "Fetch one URL and return only the formats you " +
            "request: markdown, plain text, links, page metadata, cleaned or " +
            "raw HTML, images, embedded page data (`state_json`), a " +
            "screenshot reference, or JSON extracted against your own field " +
            "schema (deterministic extraction with evidence per field, no " +
            "language model). Each format can be capped (`max_chars`, " +
            "`max_items`) and markdown/text/HTML can be reduced to the main " +
            "content (`mode: 'reader'`). A format that fails is reported in " +
            "`format_results` while the others are still returned. Pass " +
            "`query` (with markdown or text requested) to keep only the " +
            "passages that answer it, with offsets in `query_selection`. " +
            "Publication and modification dates are returned at the top " +
            "level when the page states them. Blocked pages are diagnosed, " +
            "not bypassed. Use Clawifi /fetch when you just need the page " +
            "as markdown or a PDF read with page counts.",
        docsUrl: "https://clawifi.dev/docs",
        categories: ["web-scraping", "web-extraction"],
        notes: [
            "1 credit per scrape, 3 when the page was rendered in a browser " +
            "(`mode: 'browser'` or a `screenshot` format forces it). A " +
            "scrape served from Clawifi's cache costs 0.",
            "`query` needs a 'markdown' or 'text' format in `formats`; " +
            "otherwise Clawifi rejects the request with 422.",
            "Typed format options: `mode` other than 'default' applies only " +
            "to markdown, text, html and raw_html; `quality` only to " +
            "screenshot; `schema` only to json (and json needs it).",
            "`screenshot` and saved HTML come back as artifact references " +
            "(ids), not bytes.",
        ],
    },
    request: { method: "POST", path: "/scrape" },
    input: {
        schema: { body: zClawifiScrapeBody },
        // not exposed (see the mirror): stripped at the top level only, so
        // a key of the same name inside a json `schema` is never touched
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
                    description: "the page fetched under the scrape; a " +
                        "cache hit is not counted",
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
            },
        },
        /** `mode: 'browser'` and a `screenshot` format force the browser
         *  (`ScrapeRequest.fetch_request`); anything else may still
         *  escalate, which is the answer, so it promises the base only. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const names = (body.formats ?? []).map((format) =>
                typeof format === "string" ? format : format.type
            );
            const browser = body.mode === "browser" ||
                names.includes("screenshot");
            return {
                counts: { page: 1, ...(browser ? { browser_render: 1 } : {}) },
            };
        },
        evidence: ({ data, utils }) => {
            const cached = utils.json.optionalGet(data.output, "$.cache_hit");
            if (cached === true) return { counts: { page: 0 } };
            const mode = utils.json.optionalGet(data.output, "$.mode_used");
            const rendered = mode === "browser" || mode === "session_browser";
            return {
                counts: { page: 1, ...(rendered ? { browser_render: 1 } : {}) },
            };
        },
    },
});
