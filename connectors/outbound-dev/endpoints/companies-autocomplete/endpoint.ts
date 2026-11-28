import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompaniesAutocompleteQuery } from "./schema/inputs.ts";

/** `GET /companies/autocomplete` — suggested company names, headquarters
 *  cities or states, free. SYNC. */
export default defineEndpoint({
    meta: {
        displayName: "Suggest Company Names",
        summary:
            "Suggest company names, headquarters cities or states as they are typed.",
        description: "Suggest company names (`field=company`), " +
            "headquarters cities (`field=location`, values of the " +
            "`headquartersCity` filter) or states (`field=state`, values of " +
            "`headquartersStateName`) as they are typed. Free. Send `field` " +
            "and `q`, two characters or more. The answer carries " +
            "`suggestions`, each with a `name`, a company's website " +
            "`domain` when known, and a state's `country`: send a " +
            "suggestion's `name` as the filter's value in " +
            "`outbound-dev#companies/search`. `orgType=investor` narrows " +
            "company names to investors. Filters with a fixed list of " +
            "values, such as industries and countries, are listed by " +
            "`outbound-dev#companies/filters` instead.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/companies/suggest-company-filter-values",
        categories: ["company-enrichment"],
        notes: [
            "`orgType` is taken only with `field=company`, and `countries` " +
            "and `excludedCountries` only with `field=state`; elsewhere " +
            "they answer 422 `validation_failed`.",
        ],
    },
    request: { method: "GET", path: "/companies/autocomplete" },
    input: { schema: { queryParams: zCompaniesAutocompleteQuery } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
