import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInvestorsQueryParams } from "./schema/inputs.ts";

/** GET /investors — billed per row returned. */
export default defineEndpoint({
    meta: {
        displayName: "Search Investors",
        summary: "Search investors by type, country, cheque size and recent " +
            "activity.",
        description:
            "Investor records filtered by keyword, type (vc, angel, cvc, pe, " +
            "growth, accelerator, family_office, syndicate), HQ country, the " +
            "countries of the companies they funded, the largest round they " +
            "joined, round count and date of their latest round. Returns per " +
            "investor: id, name, domain, type, country and activity counts. 1" +
            " credit per investor returned.",
        docsUrl: "https://datahyena.com/docs",
        categories: ["funding-data"],
    },
    request: { method: "GET", path: "/investors" },
    input: { schema: { queryParams: zInvestorsQueryParams } },
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
