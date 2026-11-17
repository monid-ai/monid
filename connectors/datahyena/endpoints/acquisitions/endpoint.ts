import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAcquisitionsQueryParams } from "./schema/inputs.ts";

/** GET /acquisitions — billed per row returned. */
export default defineEndpoint({
    meta: {
        displayName: "List Acquisitions and Mergers",
        summary:
            "Latest acquisitions and mergers with acquirer, target and deal " +
            "value.",
        description:
            "Acquisition and merger events newest first by announcement date." +
            " Filter by date, payment type (cash, stock, mixed, undisclosed)," +
            " merger or acquisition, deal value in USD, the target's country," +
            " industry, vertical or NAICS code, or one company (as acquirer " +
            "or target) by domain. Returns per deal: id, acquirer and target " +
            "companies with domain and country, amountUsd, payment type, " +
            "announcedAt and source article URLs. 1 credit per deal returned." +
            " Suited for M&A monitoring and account research.",
        docsUrl: "https://datahyena.com/docs",
        categories: ["funding-data", "company-news"],
    },
    request: { method: "GET", path: "/acquisitions" },
    input: { schema: { queryParams: zAcquisitionsQueryParams } },
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
