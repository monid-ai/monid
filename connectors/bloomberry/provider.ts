import { defineProvider } from "@shared/core";

/**
 * Bloomberry (bloomberry.com, by Revealera) — technographic data: which
 * software a company uses, when it started, and when it stopped. Every
 * endpoint is a synchronous GET against `https://api.revealera.com`, so the
 * two provider-wide hooks live HERE and every endpoint inherits them:
 *
 *   - `auth.inject`: Bloomberry authenticates with an `api_key` QUERY
 *     parameter (docs.bloomberry.com/docs/getting-started). Neither
 *     header preset fits, so the inject is spelled inline — it appends the
 *     resolved key to the request's query multimap and touches nothing
 *     else. The key is injected inside the transport only (design D16);
 *     the pure hooks never see it.
 *   - `input.toRequest`: Bloomberry spells multi-value filters as ONE
 *     semicolon-separated value (`company_country=US;GB`) — the engine
 *     sends only scalar query values, so this hook joins every array leaf
 *     before the wire (the akta comma-join pattern, with ';').
 *
 * Billing: Bloomberry's meter is CREDITS (one pool per account; the
 * trial key carries 1,000). The published rate card
 * (docs.bloomberry.com/reference/how-api-credits-are-calculated) is per
 * endpoint and lives in each endpoint's `usage.model`: 1 credit per
 * company enrichment (flat), 10 per tech-stack change returned, 2 per
 * tech-stack customer returned; the vendor catalog is free. No response
 * carries a per-call meter (the `X-Credits-Month-Remaining` header is a
 * balance, not a draw), so there is no `consolidate` — the derived fold is
 * the settle.
 */
export default defineProvider({
    name: "bloomberry",
    meta: {
        displayName: "Bloomberry",
        summary:
            "Technographics: which software a company uses, with start and stop dates.",
        description: "Technographic data from Bloomberry (a Revealera " +
            "product): which of 1,700+ B2B tools a company uses, when it " +
            "started using each one, and when it stopped — detected from " +
            "public infrastructure records (DNS, certificate logs, new " +
            "subdomains, website JavaScript), so it catches tools a " +
            "company's website never mentions. Enrich one domain with its " +
            "current stack; list the companies that just adopted, dropped, " +
            "upgraded or downgraded a given vendor or category (dated " +
            "signals, filterable by size, industry and country); or list " +
            "every current customer of a vendor. Use it to build prospect " +
            "lists from the tools a buyer runs, to time outreach to an " +
            "adoption, or to spot a competitor's churn.",
        homepageUrl: "https://bloomberry.com",
        docsUrl: "https://docs.bloomberry.com",
        categories: ["technographics", "company-enrichment"],
    },
    auth: {
        /** `?api_key=<key>` — appended to the query multimap (one value).
         *  Spelled inline: `presets.auth.*` only know headers. */
        inject: ({ data }) => ({
            ...data.request,
            query: { ...data.request.query, api_key: [data.params.apiKey] },
        }),
    },
    request: { baseUrl: "https://api.revealera.com" },
    // Single synchronous GET; the list endpoints page at most 20 rows, so
    // the engine's default budget is ample — pinned explicitly for parity
    // with the other sync-GET providers.
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    input: {
        toRequest: ({ data }) => ({
            ...data.input,
            queryParams: Object.fromEntries(
                Object.entries(data.input.queryParams ?? {}).map((
                    [key, value],
                ) => [key, Array.isArray(value) ? value.join(";") : value]),
            ),
        }),
    },
    lifecycle: {
        /** Bloomberry reports some failures on HTTP 200 with a one-field
         *  body (observed 2026-10-20: `{"error": "That vendor does not
         *  exist in our database"}` for an unknown `vendor_name`). The
         *  declarative path judges by HTTP status alone, so `start` takes
         *  over the one exchange and synthesizes 422 (OURS) over
         *  providerHttpStatus 200 (THEIRS, design D12) — the engine then
         *  forces zero usage and the caller sees a provider error instead
         *  of an empty success. Only an object body with a string
         *  top-level `error` is judged; every other 2xx body (the
         *  `vendors` / `signals` / `users` envelopes, the catalog array)
         *  relays verbatim. The opoint pattern. */
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const error = Array.isArray(res.body)
                ? undefined
                : utils.json.optionalGet(res.body, "$.error");
            if (typeof error === "string" && error.length > 0) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 422,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        /** THE credit system (design D26): Bloomberry meters one pool of
         *  credits per account — single pool ⇒ id `default`. Each
         *  endpoint's model states its own draw against it. */
        credits: { default: { label: "Bloomberry credits" } },
    },
});
