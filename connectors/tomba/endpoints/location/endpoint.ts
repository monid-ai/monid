import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zLocationQueryParams } from "./schema/inputs.ts";

/** GET /location — a company's addresses counted by country. */
export default defineEndpoint({
    meta: {
        displayName: "Count Employees by Country",
        summary:
            "Count a company's known email addresses by the country of the people they belong to.",
        description: "Return, for each country, how many of a domain's " +
            "email addresses belong to people in that country (two-letter " +
            "country code + total). `data` is an empty array when Tomba " +
            "has no location data for the domain. Suited for mapping a " +
            "company's geographic footprint; pass a country code to " +
            "/domain-search as country to list those people.",
        docsUrl: "https://docs.tomba.io/api/finder#location",
        categories: ["company-enrichment"],
        notes: [
            "Every successful call costs 1 email count credit, including " +
            "an empty result; when that balance is used up the endpoint " +
            "answers 429.",
        ],
    },
    request: { method: "GET", path: "/location" },
    input: {
        schema: {
            queryParams: zLocationQueryParams.required({ domain: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "location lookups",
            consumes: { credit: "email_count", amount: 1 },
        },
    },
});
