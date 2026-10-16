import { defineProvider, presets } from "@shared/core";

/**
 * Lev8 (lev8.com) — search, research, enrich and extract structured data
 * about people, companies and creators. JSON over HTTP against
 * `https://app.lev8.com`, bearer auth with a `lev8_live_` token.
 *
 * Five catalog endpoints (design D1): Entity Search (async, one monid run
 * drives create_task → status → fetch), Contact Search, Deep Search,
 * Enrich and Extract. `GET /v1/credit/balance` is NOT exposed: on a broker
 * it reports the shared house account to every caller (design D2).
 *
 * EVERY PAID CALL CARRIES `Idempotency-Key: {runId}:<op>` — the host-stable
 * run id (design D3, the orbit posture). Lev8 saves a completed response
 * together with its settlement and replays it for the same key + body at no
 * extra charge, so a retried start converges on the first attempt instead of
 * paying twice. That is why the provider authors a start-only lifecycle: it
 * is the one place a hook can read `data.run.runId`. Entity Search replaces
 * it with its own start + poll.
 *
 * BILLING (design D4): Lev8 meters one credit pool. No response carries a
 * receipt, so there is no `usage.consolidate` — each endpoint's model ×
 * evidence IS the bill, written from docs.lev8.com/guides/billing
 * (2026-10-16) and Lev8's own settlement code. A business-level failure
 * (`success: false`, an empty contact) answers 200 and bills 0.
 */
export default defineProvider({
    name: "lev8",
    meta: {
        displayName: "Lev8",
        summary:
            "Find people, companies and creators; find contacts; research, enrich and extract lists.",
        description: "Lead discovery and research for agents. Find " +
            "companies, people, X/YouTube/TikTok/Instagram creators, " +
            "Shopify stores, Xiaohongshu accounts and WeChat Official " +
            "Accounts from a natural-language objective; find one " +
            "contact's email or phone number; answer a research question; " +
            "fill a JSON Schema of fields for a known entity; and extract " +
            "follower, following, stargazer and contributor lists or a " +
            "structured list from a web page.",
        homepageUrl: "https://lev8.com",
        docsUrl: "https://docs.lev8.com",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "Every paid call is idempotent per run: a retried run replays " +
            "Lev8's saved response and is not charged twice.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://app.lev8.com",
        headers: { Accept: "application/json" },
    },
    // Lev8's synchronous workflows run up to 10 minutes server-side
    // (deep search / extract maxExecutionTime); enrich 5.
    timeouts: { requestMs: 600_000, runMs: 600_000 },
    lifecycle: {
        start: async ({ data, utils }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":call",
                },
            });
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        credits: {
            default: {
                label: "Lev8 credits",
                description: "Lev8 account credits, the unit of every " +
                    "price on docs.lev8.com/guides/billing.",
            },
        },
    },
});
