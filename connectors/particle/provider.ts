import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Particle (particle.pro) — podcast intelligence. Every endpoint here is a
 * synchronous GET against `https://api.particle.pro`, auth `X-API-Key`
 * (api.particle.pro/openapi.json and llms.txt, read 2026-10-28).
 *
 * Billing: Particle publishes a fixed US-dollar LIST PRICE per call for
 * every endpoint (particle.pro/pricing, "Endpoint List Prices", Individual
 * column, read 2026-10-29): that is what an API-key account pays per call
 * beyond its monthly request bundle, on any plan. The OpenAPI
 * `x-payment-info.price` on each operation is a DIFFERENT, higher rate card —
 * the keyless x402/MPP price (about 3x list) — which a keyed account never
 * pays, so it is not the pin. No response body carries a meter (the
 * `Payment-Receipt` header exists only on the keyless path), so there is no
 * `usage.consolidate` and the derived fold settles — the keenable/pdl
 * posture. One pool `default` ("US dollars") and a provider-level PER_CALL of
 * $0.003; endpoints that cost more override the amount and nothing else.
 *
 * Errors are RFC 7807 problem+json (`type`, `title`, `status`, `detail`,
 * `error_code`, `resolve{message,url,action}`). `fromError` lifts the
 * machine code and the human detail; the raw envelope stays under `raw`.
 */
export default defineProvider({
    name: "particle",
    meta: {
        displayName: "Particle",
        summary: "Podcast transcripts, mentions, guests, sponsors and " +
            "rankings across 160,000+ shows.",
        description: "Podcast intelligence for agents — 160,000+ podcasts " +
            "transcribed, diarized and speaker-identified, new episodes " +
            "searchable within minutes of airing. Find a show by name, " +
            "list its episodes, search what was said inside episodes by " +
            "meaning or exact phrase, pull every line that mentions a " +
            "person or company, read a full diarized transcript, and " +
            "resolve free-text names to the people, companies and " +
            "knowledge-graph entities the other endpoints take as " +
            "filters. Responses form a graph: the slugs one endpoint " +
            "returns are the inputs to the others.",
        homepageUrl: "https://particle.pro",
        docsUrl: "https://docs.particle.pro",
        categories: ["podcasts"],
        notes: [
            "Every endpoint is a fixed price per call in US dollars, " +
            "charged whether or not results are found; a vendor non-2xx " +
            "answer is zero-billed.",
            "Slugs are assigned by Particle, not derived from names (20VC " +
            "is 'the-twenty-minute-vc'): take them from responses, never " +
            "construct them — a guessed slug is a 404.",
            "List-valued query parameters are comma-separated strings " +
            "(e.g. include=related,coverage).",
            "Particle's API terms require the attribution carried in API " +
            "output to be shown to end users and bar redistributing or " +
            "storing output beyond real-time display " +
            "(particle.pro/legal/tos-api).",
        ],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://api.particle.pro" },
    /** Headroom over the engine's 30 s default: a full transcript is a
     *  few hundred KB and wide searches can run long on the vendor side.
     *  The recorded calls all answered in under a second (2026-10-29). */
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** THE credit system (design D26): Particle's published prices
         *  are dollar amounts per call, so the pool IS US dollars —
         *  pinned from the pricing page's Individual (list) column
         *  (2026-10-29), re-audited on repricing. */
        credits: {
            default: {
                label: "US dollars",
                description: "Particle's published list price per call in US " +
                    "dollars (particle.pro/pricing, Endpoint List Prices, " +
                    "Individual column, 2026-10-29).",
            },
        },
        /** The $0.003 tier; costlier endpoints override the amount. No
         *  `consolidate`: no response body carries a receipt. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.003 },
        },
    },
    output: {
        /** Particle's error envelope is RFC 7807 problem+json. Vendor
         *  non-2xx is DATA — the engine zero-bills it — and `error_code`
         *  is the part an agent branches on (`api_key_required`,
         *  `premium_required`, `not_found`, `rate_limited`). The body is
         *  guarded: a non-JSON refusal (an HTML gateway page) still
         *  digests. */
        fromError: ({ data, utils }) => {
            const body = data.output;
            if (
                typeof body !== "object" || body === null ||
                Array.isArray(body)
            ) {
                return { message: "Particle API error", raw: body };
            }
            const detail = utils.json.optionalGet(body, "$.detail");
            const title = utils.json.optionalGet(body, "$.title");
            const code = utils.json.optionalGet(body, "$.error_code");
            const resolve = utils.json.optionalGet(body, "$.resolve");
            const hint = resolve === undefined
                ? undefined
                : utils.json.optionalGet(resolve, "$.message");
            return {
                message: typeof detail === "string" && detail !== ""
                    ? detail
                    : typeof title === "string" && title !== ""
                    ? title
                    : "Particle API error",
                ...(typeof code === "string" ? { code } : {}),
                ...(typeof hint === "string" ? { resolve: hint } : {}),
                raw: body,
            };
        },
    },
});
