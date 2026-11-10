import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * AI/ML API `GET /v1/key` — what the calling key is allowed to do and
 * what it has spent. Free.
 *
 * The response is `{data: {name, disabled, prefix, scopes[], limit,
 * created_at, updated_at, expires_at, total_usage, total_usage_usd,
 * monthly_usage, monthly_usage_usd}}` (verified live 2026-10-15).
 * `*_usage` is in gateway CREDITS and `*_usage_usd` the same figure in
 * dollars — their ratio is the 2,000,000-credits-per-dollar constant the
 * metered endpoints bill against, so this endpoint doubles as the
 * provider's own check on that rate.
 *
 * `prefix` is the key's first 8 characters, which the vendor publishes as
 * a key IDENTIFIER; the secret itself never appears in the body.
 */
export default defineEndpoint({
    meta: {
        displayName: "AI/ML API Key Info",
        summary: "Scopes and month-to-date spend for the calling key.",
        description: "Report what the configured AI/ML API key can reach " +
            "and what it has cost: `scopes` (`model:chat`, `model:image`, " +
            "`model:embeddings`, …) says which model families the key may " +
            "call, `disabled` and `expires_at` whether it is still live, " +
            "`limit` any cap set on it, and the usage pair gives spend " +
            "both month-to-date and lifetime, in gateway credits and in " +
            "US dollars. Useful as a pre-flight check before a run " +
            "(`model:image` absent means `aimlapi#images/generations` will " +
            "be refused) and as the account's own spend figure. Free.",
        docsUrl:
            "https://docs.aimlapi.com/api-references/service-endpoints/api-key-usage",
        categories: ["text-generation", "image-generation"],
        notes: [
            "Free — the gateway reports no meter on this call.",
            "Returns the key's `prefix` (its first 8 characters, the " +
            "vendor's own key identifier), never the key.",
            "`total_usage` / `monthly_usage` are gateway credits; the " +
            "`_usd` twins are the same spend in dollars.",
        ],
    },
    request: { method: "GET", path: "/key" },
    usage: { model: { kind: UsageModelKind.FREE } },
});
