import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFundingEventsQueryParams } from "./schema/inputs.ts";

/** GET /funding-events — billed per row returned. */
export default defineEndpoint({
    meta: {
        displayName: "List Funding Rounds",
        summary:
            "Latest funding rounds, filterable by round, amount, country and " +
            "industry.",
        description:
            "Funding rounds newest first by announcement date. Filter by " +
            "round (pre-seed, seed, angel, series-a to series-g, venture, " +
            "debt, grant and more), amount in USD, announcement date, HQ " +
            "country, LinkedIn industry, vertical, NAICS code, headcount " +
            "bucket, or one company by domain. Returns per round: id, round, " +
            "amountUsd with the original currency, announcedAt, lead and " +
            "other investors, the company (name, domain, LinkedIn, country, " +
            "industry, headcount) and source article URLs. 1 credit per round" +
            " returned; includeTotal gives the match count free. Suited for " +
            "tracking newly funded companies, signal-based outbound and " +
            "market maps.",
        docsUrl: "https://datahyena.com/docs",
        categories: ["funding-data"],
    },
    request: { method: "GET", path: "/funding-events" },
    input: { schema: { queryParams: zFundingEventsQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "rows",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.queryParams.limit },
        }),
    },
});
