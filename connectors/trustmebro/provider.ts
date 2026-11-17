import { defineProvider, presets } from "@shared/core";

/**
 * Trust Me Bro (trustmebro.to) - claim verification receipts.
 *
 * One endpoint today (`POST /v1/verify`). Auth is a bearer key. Billing
 * truth is the `source` field in the 200 body ("retrieved" or
 * "constructed"), so the connector never reads a header: hooks see the
 * response envelope, and header access is unverified. `X-TMB-Balance` and
 * `X-TMB-Cost` are TMB wallet headers and are never passed to the agent.
 */
export default defineProvider({
    name: "trustmebro",
    meta: {
        displayName: "Trust Me Bro",
        summary: "Fact-check a claim: verdict plus real sources, as a receipt.",
        description: "Trust Me Bro checks a written claim against real " +
            "sources and returns a verdict with the sources behind it. It " +
            "refuses to invent sources or quotes: when the evidence is thin " +
            "the verdict says so (for example INSUFFICIENT_EVIDENCE) " +
            "instead of guessing.",
        homepageUrl: "https://trustmebro.to",
        docsUrl: "https://trustmebro.to/api",
        categories: ["fact-checking"],
    },
    auth: { inject: presets.auth.bearer() },
    // credentials omitted: the default { apiKey } shape.
    // Local env var: TRUSTMEBRO_CREDENTIALS_API_KEY (or TRUSTMEBRO_API_KEY).
    request: { baseUrl: "https://trustmebro.to" },
    // A fresh check runs the whole engine: live constructed calls took
    // 18.7 to 27.6 s. A short timeout would bill TMB's partner wallet
    // without delivering the answer to the agent.
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        // Pinned v1 vendor prices in US dollars (the exa posture). Re-audit
        // when TMB reprices (backend/apiwallet.py PRICE_RETRIEVED and
        // PRICE_CONSTRUCTED).
        credits: { default: { label: "US dollars" } },
    },
    output: {
        // Error bodies are { detail } (FastAPI) or { error, detail, ... }.
        // The 402 body also carries TMB's own wallet fields (balance_usd,
        // topup_url). Those belong to the partner account, not to the
        // agent, so this digest keeps only the message and the code and
        // deliberately does NOT keep the raw body (the usual `raw` key).
        fromError: ({ data, utils }) => {
            const detail = utils.json.optionalGet(data.output, "$.detail");
            const code = utils.json.optionalGet(data.output, "$.error");
            // FastAPI validation errors carry a LIST in `detail`.
            const message = typeof detail === "string" && detail !== ""
                ? detail
                : detail !== undefined && detail !== null
                ? JSON.stringify(detail)
                : "Trust Me Bro error";
            return {
                message,
                ...(typeof code === "string" && code !== "" ? { code } : {}),
            };
        },
    },
});
