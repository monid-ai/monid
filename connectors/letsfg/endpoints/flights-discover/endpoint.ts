import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDiscoverBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "LetsFG Destination Discovery",
        summary:
            "Indicative cheapest fares from one origin to up to 20 destinations, in one call.",
        description: "Price up to 20 destinations from one origin on one " +
            "date in a single call, for questions like 'where can I fly " +
            "cheaply from New York in July'. Returns one row per " +
            "destination, cheapest first: the indicative lowest price and " +
            "currency, or found: false where no price was available, plus " +
            "a summary naming the cheapest destination. These prices come " +
            "from a lightweight data source and are for ranking " +
            "destinations, not quoting: they are not bookable and carry no " +
            "booking link. Once the traveller picks a destination, run " +
            "letsfg#flights/search on it for live fares and booking links; " +
            "that full search often finds a lower price.",
        docsUrl: "https://letsfg.co/developers/docs/api-search/",
        categories: ["flights"],
        notes: [
            "Answers in 2-5 s.",
            "Billing: the whole batch counts as one search, $0.01 past " +
            "LetsFG's look-to-book allowance, and only when at least one " +
            "destination was priced.",
        ],
    },
    request: { method: "POST", path: "/flights/discover" },
    input: { schema: { body: zDiscoverBody } },
    timeouts: { requestMs: 30_000, runMs: 35_000 },
    usage: {
        /** One search for the whole batch
         *  (https://letsfg.co/developers/docs/api-search/, 2026-10-23),
         *  at the $0.01 overage rate. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            label: "searches",
            description: "batches that priced at least one destination",
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: () => ({ counts: { PAGE: 1 } }),
        evidence: ({ data, utils }) => ({
            counts: {
                PAGE: (utils.json.optionalNum(
                        data.output,
                        "$.summary.prices_found",
                    ) ?? 0) > 0
                    ? 1
                    : 0,
            },
        }),
    },
});
