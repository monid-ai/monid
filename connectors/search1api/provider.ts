import { defineProvider, presets } from "@shared/core";

/**
 * Search1API (s1.dev) — live web data for agents: web search, news, page
 * crawling, sitemap discovery, and trending topics over
 * `https://api.search1api.com` with `Authorization: Bearer <key>`.
 * Five synchronous JSON endpoints, one flat price each: 1 Search1API credit
 * per call (the vendor's published rate — every paid endpoint carries the
 * same `x-payment-info` price of $0.003, i.e. 1 credit at the public
 * $0.003/credit card). Responses carry no usage meter, so there is no
 * `consolidate` — the derived fold is the bill.
 *
 * `/search` and `/news` also accept a BATCH array body (one credit per
 * item); the connector mirrors the single-object form only — batching is
 * the same verb repeated, and one call per run keeps the flat card exact.
 *
 * Vendor non-2xx is DATA: errors arrive as `{detail}` or an RFC-9457
 * problem body (`{title, detail, status}` — 402 x402 payment challenges
 * included), which `output.fromError` normalizes here.
 */
export default defineProvider({
    name: "search1api",
    meta: {
        displayName: "Search1API",
        summary: "Live web search, news, page crawling, sitemap, and " +
            "trending topics — flat 1 credit per call.",
        description: "Search1API gives agents live web data through five " +
            "simple endpoints: web search across Google, Bing, DuckDuckGo, " +
            "Yahoo, YouTube, X, Reddit, GitHub, arXiv, WeChat, Bilibili, " +
            "IMDb, Wikipedia and the Chinese engines (Sogou, Baidu, 360, " +
            "Quark); a dedicated news vertical; single-URL page crawling to " +
            "clean Markdown; sitemap link discovery; and trending topics " +
            "from GitHub and Hacker News. One API key, flat per-call " +
            "pricing — the free plan includes 100 credits at https://s1.dev.",
        homepageUrl: "https://s1.dev",
        docsUrl: "https://docs.s1.dev",
        categories: ["web-search"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.search1api.com" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D26): Search1API meters in its OWN
         *  credits — 1 credit per call on every endpoint here (the public
         *  card prices each at $0.003; the $/credit conversion stays the
         *  broker card's one search1api row). */
        credits: { default: { label: "Search1API credits" } },
    },
    output: {
        /** Search1API error envelopes: `{detail: "..."}` on ordinary 4xx and
         *  RFC-9457 problem bodies (`{type, title, status, detail}`) on the
         *  402 x402 challenge. Read `detail` first, then `title`. */
        fromError: ({ data, utils }) => {
            const detail = utils.json.optionalGet(data.output, "$.detail");
            const title = utils.json.optionalGet(data.output, "$.title");
            const message = utils.json.optionalGet(data.output, "$.message");
            const text = [detail, title, message].find((v) =>
                typeof v === "string" && v !== ""
            );
            return {
                message: typeof text === "string" ? text : "Search1API error",
                raw: data.output,
            };
        },
    },
});
