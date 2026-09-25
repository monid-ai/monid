import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEventSplitsPathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get Event Betting Splits",
        summary: "Get public betting splits (money vs tickets) for an event.",
        description:
            "Get public betting splits for one event by its event id \u2014 the share of bets (tickets) versus the share of money wagered on each side, market by market. Reveals where the public and the sharp money diverge.",
        docsUrl: "https://lumify.ai/docs",
        categories: ["sports-betting"],
    },
    request: { method: "GET", path: "/events/{event_id}/splits" },
    input: { schema: { pathParams: zEventSplitsPathParams } },
    usage: {
        /** 1 credit when splits are available — https://lumify.ai/docs
         *  (2026-09-23). A 200 with `available: false` reports
         *  `X-Credits-Used: 0`. Hooks cannot read response headers, so
         *  the body flag is the meter. Estimate assumes available (the
         *  pre-run honest max / fallback rate-card amount). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "splits reads",
            description: "available splits payloads returned",
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
