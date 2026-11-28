import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPeopleAutocompleteQuery } from "./schema/inputs.ts";

/** `GET /people/autocomplete` — suggested values for a free-text people
 *  filter, free. SYNC. */
export default defineEndpoint({
    meta: {
        displayName: "Suggest People Filter Values",
        summary:
            "Suggest job titles, companies, locations, schools or skills as they are typed.",
        description: "Suggest values for a free-text people filter as it " +
            "is typed: job titles, companies, websites, locations, regions, " +
            "schools and skills. Free. Send `field` (which filter) and `q` " +
            "(what has been typed so far). The answer carries `suggestions`, " +
            "each with a `name`, and for `field=company` its website " +
            "`domain` when known: send a suggestion's `name` as the " +
            "filter's value in `outbound-dev#people/search`. Filters with a " +
            "fixed list of values, such as seniority and department, are " +
            "listed by `outbound-dev#people/filters` instead.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/people/suggest-people-filter-values",
        categories: ["people-enrichment"],
    },
    request: { method: "GET", path: "/people/autocomplete" },
    input: { schema: { queryParams: zPeopleAutocompleteQuery } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
