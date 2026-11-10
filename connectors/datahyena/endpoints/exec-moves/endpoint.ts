import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zExecMovesQueryParams } from "./schema/inputs.ts";

/** GET /exec-moves — billed per row returned. */
export default defineEndpoint({
    meta: {
        displayName: "List Executive Moves",
        summary:
            "Executive appointments, promotions and departures by company.",
        description: "Leadership changes newest first by announcement date: " +
            "appointments, promotions, departures and transitions, with " +
            "C-level, VP and founder filters. Filter by date, move type, " +
            "seniority, HQ country, NAICS code, or one company by domain. " +
            "Returns per move: id, the person, the role and seniority, move " +
            "type, the company with domain and country, announcedAt and " +
            "source article URLs. 1 credit per move returned. Suited for " +
            "spotting new decision makers and leadership turnover.",
        docsUrl: "https://datahyena.com/docs",
        categories: ["company-news", "people-enrichment"],
    },
    request: { method: "GET", path: "/exec-moves" },
    input: { schema: { queryParams: zExecMovesQueryParams } },
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
