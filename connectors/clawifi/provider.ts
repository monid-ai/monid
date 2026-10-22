import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Clawifi (clawifi.dev): web reading for agents. JSON over HTTP against
 * `https://api.clawifi.dev` with `Authorization: Bearer <key>`. Four
 * synchronous endpoints: `/search/free`, `/fetch`, `/scrape`, `/map`.
 *
 * THE METER (design D27): Clawifi reports what a call cost in the
 * `X-Clawifi-Credits-Charged` response header, and since 1.7.5 copies the
 * same number into a JSON object body as top-level `credits_charged` when
 * the request carries `X-Clawifi-Include-Credits: 1`. The connector sends
 * that header on every request (static `request.headers`, merged into
 * every doc) and the provider `consolidate` plucks `credits_charged` out of
 * the payload, the way firecrawl plucks `creditsUsed`.
 *
 * A zero claim is pruned by the engine and falls back to the derived fold,
 * so a cache hit (Clawifi charges 0) must ALSO derive 0. That is why
 * fetch, scrape and map use metered lines whose evidence reads
 * `cache_hit` / the returned URLs, rather than a flat PER_CALL that the
 * engine would always append. `/search/free` is the one flat endpoint: every
 * 2xx search costs 1 credit, results or not.
 *
 * Rate card: `clawifi/core/pricing.py`, published as `credit_costs` in
 * `GET /billing/manifest` and https://clawifi.dev/pricing.json (verified
 * 2026-10-23): search, plain fetch or scrape 1; a fetch or scrape that
 * used the browser 3; map 1 per started 10 URLs returned, at least 1.
 *
 * BILLING LINES NOT MODELED, and why (D29 asks for the exclusions to be
 * written down):
 *   - PDF reading on `/fetch` and `/scrape`: 2 credits per started 50 pages
 *     read, IN PLACE of the base call. Whether a URL resolves to a PDF is the
 *     answer, not the question, so the estimate cannot see it. `/fetch`
 *     evidence reads `data.document.pages_read` and derives it exactly;
 *     `/scrape` does not return the page count, so a PDF scrape settles on
 *     the vendor's claim and the fold rides out as `usage.mismatch.derived`.
 *   - Target errors: when the target page answers an error and Clawifi
 *     returns it (502 `upstream_request_error`), Clawifi charges the call's
 *     minimum. The engine zero-bills every non-2xx envelope, so the buyer
 *     pays nothing for those and the vendor credit is absorbed.
 *   - Passages (`query` / `top_k`) add 0 credits, so they are not a line.
 */
export default defineProvider({
    name: "clawifi",
    meta: {
        displayName: "Clawifi",
        summary: "Web search, page and PDF to markdown, query-focused " +
            "passages, and site maps for agents.",
        description: "Web reading for agents. Search the web through " +
            "several engines and get results with their source engine, " +
            "snippet and date when known. Fetch a page or PDF as markdown, " +
            "or pass a question and get only the passages that answer it, " +
            "with section headings and character offsets. Scrape a page " +
            "into the formats you choose (markdown, text, links, metadata, " +
            "HTML, schema-shaped JSON). Map a site's URLs from robots.txt, " +
            "sitemaps, feeds and page links. A cached fetch, a failure on " +
            "Clawifi's side and any response with status 400 or above cost " +
            "nothing. Clawifi does not bypass bot protection or CAPTCHAs: a " +
            "blocked page comes back with a diagnosis instead.",
        homepageUrl: "https://clawifi.dev",
        docsUrl: "https://clawifi.dev/docs",
        categories: ["web-search", "web-scraping"],
        notes: [
            "Clawifi validates every target before sending a request: " +
            "localhost, private and link-local addresses and cloud " +
            "metadata hosts are refused with 422, which costs nothing.",
            "Rate limits are per account and per site (at most 60 calls a " +
            "minute to one site from all callers together). A 429 carries " +
            "Retry-After in whole seconds and costs nothing.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://api.clawifi.dev",
        // opt-in body meter (Clawifi 1.7.5): JSON object responses then
        // carry top-level `credits_charged`, read by `usage.consolidate`
        headers: { "X-Clawifi-Include-Credits": "1" },
    },
    /** `/fetch` mirrors Clawifi's caller-set `timeout_seconds` (no vendor
     *  cap) and may escalate to a browser or read a PDF of up to 500 pages
     *  (the reader is killed after 45 s); `/search/free` with `free_auto`
     *  tries engines in turn at up to 8 s each. 120 s covers those paths
     *  without cutting off a request Clawifi is still serving; `runMs` sits
     *  just above it so the run never ends before the transport does. */
    timeouts: { requestMs: 120_000, runMs: 125_000 },
    usage: {
        /** THE credit system (design D26): Clawifi meters in its own
         *  credits, and the dollar rate depends on the plan or credit pack
         *  (Starter $19 / 10,000 credits, Pro $99 / 125,000, Scale $299 /
         *  500,000), so the pool is credits and the conversion stays with
         *  the broker card. */
        credits: { default: { label: "Clawifi credits" } },
        /** The flat floor: `/search/free` inherits it (1 credit for every
         *  2xx search). fetch, scrape and map override it with metered
         *  lines so a zero-cost answer can derive zero. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
        /** The vendor's OWN claim (design D27): top-level `credits_charged`
         *  on every JSON object response (sent because of the request
         *  header above). PLUCKED out of the payload, since it is a receipt
         *  rather than data. Entry OMITTED when absent (never `?? 0`), so
         *  the derived fold settles; a present non-zero claim WINS and the
         *  rate card becomes the per-run cross-check. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.credits_charged",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** Clawifi's error envelope is `{error: {code, message, retryable,
         *  suggested_action, request_id, details}}`, plus FastAPI's legacy
         *  `detail` on auth errors (recorded live: 401 `Invalid API key`).
         *  Vendor non-2xx is DATA, and the engine zero-bills it. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            const retryable = utils.json.optionalGet(
                data.output,
                "$.error.retryable",
            );
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Clawifi API error",
                ...(typeof code === "string" ? { code } : {}),
                ...(typeof retryable === "boolean" ? { retryable } : {}),
                raw: data.output,
            };
        },
    },
});
