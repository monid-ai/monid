import { defineEndpoint } from "@shared/core";
import { zQueryParams } from "./schema/inputs.ts";

/** GET /query — answer a natural-language US Census question. */
export default defineEndpoint({
    meta: {
        displayName: "censusdata.xyz Query",
        summary: "Ask any US Census question in plain English for a state, " +
            "county, city, metro area, or ZIP code.",
        description: "Query live US Census Bureau data (American Community " +
            "Survey 1-year and 5-year) for any US geography: states, " +
            "counties, cities and towns, metro areas, and ZIP codes. Covers " +
            "28,000+ indicators — population, age, race and ethnicity, " +
            "median household income, poverty rate, internet and broadband " +
            "subscription, home value, gross rent, employment, health " +
            "insurance, commute time, work-from-home rate, and educational " +
            "attainment. Resolves place names to FIPS codes and picks the " +
            "tables itself, returning a narrative 'summary' plus the " +
            "structured 'raw_data' records it used. Handles multi-location " +
            "comparisons, rankings, and year-over-year trends in one query. " +
            "Use /explore-variables first to see what exists for a topic.",
        docsUrl: "https://censusdata.xyz/skill",
        categories: ["government-data"],
        notes: [
            "An unanswerable question returns HTTP 200 with success: false " +
            "and the reason in error_details.",
        ],
    },
    request: { method: "GET", path: "/query" },
    input: { schema: { queryParams: zQueryParams } },
});
