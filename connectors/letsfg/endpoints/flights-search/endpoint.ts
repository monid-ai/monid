import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFlightSearchBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "LetsFG Flight Search",
        summary:
            "Search live, bookable flights for one route and date, with a booking link per offer.",
        description: "Run a full live flight search for one origin, one " +
            "destination and a departure date (one way, or round trip with " +
            "return_from), across airline websites, low-cost carriers and " +
            "the major travel sites at once. Returns offers cheapest first: " +
            "price and currency, every segment (airline, flight number, " +
            "times, aircraft), stopovers and total duration, the airlines " +
            "involved, checked-bag prices, refund and change conditions, and " +
            "a booking_url — the letsfg.co page where the traveller books " +
            "that exact offer and sees the final price before paying. Check " +
            "self_transfer on each offer: 'unprotected' means the tickets " +
            "are separate and a missed connection is the traveller's risk, " +
            "so say so next to the price. A starlink value starting " +
            "'confirmed' can be stated as fact; one starting 'likely' means " +
            "the aircraft type is being fitted, not that this flight has " +
            "it. Use letsfg#flights/locations to turn a place name into an " +
            "IATA code first, and letsfg#flights/discover to compare many " +
            "destinations cheaply before searching one.",
        docsUrl: "https://letsfg.co/developers/docs/api-search/",
        categories: ["flights"],
        notes: [
            "Takes 8-10 s to first results on most routes and up to 80 s " +
            "on some Asia-Pacific and Latin American routes; the call " +
            "returns once a useful set of offers is in.",
            "Results are cached for 5 minutes: the same route and date " +
            "searched again inside that window answers at once.",
            "A 200 with total_results 0 is a completed search with no " +
            "flights (a date in the past, a same-day date with no " +
            "inventory, an unserved route, or a cabin filter such as F). " +
            "It is not billed.",
            "Billing: $0.01 per search that returns at least one offer, " +
            "past LetsFG's look-to-book allowance of 200 free searches " +
            "after every booking made through the account.",
            "infants cannot exceed adults (one lap infant per adult); the " +
            "API answers 422 otherwise.",
        ],
    },
    request: { method: "POST", path: "/flights/search" },
    input: { schema: { body: zFlightSearchBody } },
    // LetsFG's docs ask clients to allow at least 90 s.
    timeouts: { requestMs: 120_000, runMs: 130_000 },
    usage: {
        /** $0.01 per search past the free allowance: blocks of 500 for
         *  $5.00 (https://letsfg.co/developers/docs/api-onboarding/,
         *  2026-10-23). One request is one search; a search with no offers
         *  does not count. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            label: "searches",
            description: "searches that returned at least one offer",
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: () => ({ counts: { PAGE: 1 } }),
        evidence: ({ data, utils }) => ({
            counts: {
                PAGE: (utils.json.optionalLen(data.output, "$.offers") ?? 0) >
                        0
                    ? 1
                    : 0,
            },
        }),
    },
});
