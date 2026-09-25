import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import {
    zEventOddsPathParams,
    zEventOddsQueryParams,
} from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get Event Odds",
        summary: "Get current betting odds for an event across books.",
        description:
            "Get the current betting odds for one event by its event id \u2014 moneyline, spread, and totals \u2014 from a chosen sportsbook (defaults to the sharpest book). Pass bookmaker to select a specific book.",
        docsUrl: "https://lumify.ai/docs",
        categories: ["sports-betting"],
    },
    request: { method: "GET", path: "/events/{event_id}/odds" },
    input: {
        schema: {
            pathParams: zEventOddsPathParams,
            queryParams: zEventOddsQueryParams,
        },
    },
    usage: {
        /** 1 credit when odds are available — https://lumify.ai/docs
         *  (2026-09-23). A 200 with `available: false` reports
         *  `X-Credits-Used: 0`. Hooks cannot read response headers, so
         *  the body flag is the meter. Estimate assumes available (the
         *  pre-run honest max / fallback rate-card amount). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "odds reads",
            description: "available odds payloads returned",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const available = utils.json.optionalGet(
                data.output,
                "$.available",
            );
            return { counts: { RESULT: available === true ? 1 : 0 } };
        },
    },
});
