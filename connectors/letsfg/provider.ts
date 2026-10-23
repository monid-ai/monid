import { defineProvider, presets } from "@shared/core";

/**
 * LetsFG (letsfg.co) — flight search across airlines and travel sites,
 * through the LetsFG Developer API: `https://letsfg.co/developers/api/v1`,
 * `X-API-Key` auth, JSON in and out.
 *
 * READ-ONLY BY DESIGN. Only search endpoints are integrated. The Developer
 * API's own booking routes (`POST /flights/book`) hold the fare on the card
 * connected to the account that owns the key, which here would be monid's
 * account, not the traveller's. So booking happens where the traveller
 * pays: every offer carries a `booking_url`, a letsfg.co page for that one
 * offer where the traveller enters their details and pays LetsFG directly.
 *
 * BILLING (look-to-book, https://letsfg.co/developers/docs/api-onboarding/,
 * checked 2026-10-23). A search is not billed per call: 200 searches are
 * free after every booking made with the key, including a booking a
 * traveller completes through an offer's `booking_url`, and a booking resets
 * the count. Past that allowance searches come in prepaid blocks of 500 for
 * $5.00, $0.01 each. A search that returns no offers, and a search that
 * fails in an outage, never count. Endpoints pin the overage rate, $0.01 per
 * search that returned something, in a US-dollar pool. LetsFG reports no
 * per-call meter, so there is no consolidate fn and settlement is the fold.
 * Location lookups are free.
 *
 * Errors are non-2xx bodies in three shapes: `{error}` (a missing key),
 * `{detail}` (an invalid key, or FastAPI validation with `detail` as a
 * list), and `{error, message}` (402 `search_allowance_exhausted`,
 * `payment_method_required`). The engine settles every non-2xx at zero.
 */
export default defineProvider({
    name: "letsfg",
    meta: {
        displayName: "LetsFG",
        summary:
            "Live flight search across airlines and travel sites, with a booking link for every fare.",
        description: "LetsFG searches flights the way a traveller would " +
            "across hundreds of sources at once: airlines' own websites, " +
            "low-cost carriers that sell only direct, and the major travel " +
            "sites. It returns live fares, not cached or indicative prices, " +
            "with segments, layovers, bag prices, fare conditions and a " +
            "letsfg.co booking link for each offer, where the traveller " +
            "sees the final price before paying. Covers worldwide routes " +
            "including US domestic.",
        homepageUrl: "https://letsfg.co",
        docsUrl: "https://letsfg.co/developers/docs/",
        categories: ["flights"],
        notes: [
            "Every offer's booking_url is a letsfg.co page for that offer, " +
            "where the traveller enters their details and pays. Give it to " +
            "the traveller; there is no booking endpoint here.",
            "Airport and city fields take IATA codes. Metro codes (LON, " +
            "NYC, TYO) search every airport in the city; resolve a place " +
            "name with letsfg#flights/locations first.",
        ],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: {
        baseUrl: "https://letsfg.co/developers/api/v1",
        headers: { Accept: "application/json" },
    },
    usage: {
        credits: { default: { label: "US dollars" } },
    },
    output: {
        /** `{error}` / `{detail}` / `{error, message}`: the human-readable
         *  string becomes `message`, a machine code (`error` beside a
         *  `message`) becomes `code`. A validation `detail` list has no
         *  single message; it rides under `raw` with the rest. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.message");
            const detail = utils.json.optionalGet(data.output, "$.detail");
            const error = utils.json.optionalGet(data.output, "$.error");
            const text = typeof message === "string" && message !== ""
                ? message
                : typeof detail === "string" && detail !== ""
                ? detail
                : typeof error === "string" && error !== ""
                ? error
                : "LetsFG API error";
            return {
                message: text,
                ...(typeof message === "string" && typeof error === "string"
                    ? { code: error }
                    : {}),
                raw: data.output,
            };
        },
    },
});
