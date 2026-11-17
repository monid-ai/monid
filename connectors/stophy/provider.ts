import { defineProvider, presets } from "@shared/core";

/**
 * Stophy (stophy.dev) — live web data for agents over
 * `https://api.stophy.dev/v1` with `Authorization: Bearer <key>`. Every
 * endpoint is a `POST` with a strict JSON body, and every 2xx answer is the
 * same envelope: `{success, data, creditsUsed, requestId}`.
 *
 * Rate card (https://docs.stophy.dev/billing, checked 2026-11-02): most
 * calls cost 1 Stophy unit ($1.50 per 1,000, $1.20 from $100, $0.80 from
 * $500, prepaid). `google/search` adds 1 unit per result read in full when
 * `scrapeResults` is on. A call that fails or finds nothing costs nothing,
 * so list endpoints bill only when `results` is non-empty.
 *
 * The response carries the vendor's own meter, `creditsUsed`:
 * `consolidate` lifts it out of the payload and a non-zero value wins
 * over the derived fold (D27). A zero is omitted, so the fold decides —
 * which is also what replays see, because the fixtures were recorded
 * without a key and Stophy meters those calls at 0.
 */
export default defineProvider({
    name: "stophy",
    meta: {
        displayName: "Stophy",
        summary: "Give your agents the live web.",
        description: "One API to search the web, read what people say, " +
            "and look up products, places, jobs and homes.",
        homepageUrl: "https://stophy.dev",
        docsUrl: "https://docs.stophy.dev",
        categories: ["web-search"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.stophy.dev/v1" },
    // Stophy answers or fails within 25 s on these endpoints.
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** One pool: Stophy meters every endpoint in the same unit. */
        credits: { default: { label: "Stophy calls" } },
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.creditsUsed",
            );
            return {
                credits: {
                    ...(typeof value === "number" && value > 0
                        ? { default: value }
                        : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** Stophy error envelope:
         *  `{success: false, error: {code, message, retryable, requestId}}`. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Stophy error",
                raw: data.output,
            };
        },
    },
});
