import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zHiringSignalsQueryParams } from "./schema/inputs.ts";

/** GET /hiring-signals — billed per row returned. */
export default defineEndpoint({
    meta: {
        displayName: "List Hiring Signals",
        summary:
            "Hiring signals read from companies' own job boards and careers " +
            "pages.",
        description:
            "Hiring signals newest first, read from companies' own job boards" +
            " and careers pages: leadership openings, founding roles, role-" +
            "family scaling, technology hiring, team build-outs, hiring " +
            "surges and hard-to-fill roles. Filter by signal type, job " +
            "function, seniority, technology named in the roles, role family," +
            " whether the roles are still open, HQ country, date, or one " +
            "company by domain. Returns per signal: id, eventType, function, " +
            "the roles behind it, the company with domain and country, and " +
            "dates. 1 credit per signal returned. Suited for finding " +
            "companies building a team you sell to.",
        docsUrl: "https://datahyena.com/docs",
        categories: ["jobs", "company-news"],
    },
    request: { method: "GET", path: "/hiring-signals" },
    input: { schema: { queryParams: zHiringSignalsQueryParams } },
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
