import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompaniesFiltersQuery } from "./schema/inputs.ts";

/** `GET /companies/filters` — the values the company search filters take,
 *  free. A static vocabulary: no tenant data, nothing charged. */
export default defineEndpoint({
    meta: {
        displayName: "Company Search Filters",
        summary:
            "List every company search filter and its values, such as industries and countries.",
        description: "List the values the company search filters take, " +
            "such as industries, countries, funding stages and " +
            "technologies. Free. Without `field`, one list per filter: " +
            "`industries` for `industriesV2`, `linkedinIndustries`, " +
            "`countries[].apiCode` for `headquartersCountryCode`, " +
            "`fundingStages` for `stage`, `technologies` and `statuses` for " +
            "`status`. With `field`, that filter's entry alone. Copy values " +
            "exactly: they are case-sensitive. Company names, headquarters " +
            "cities and states come from " +
            "`outbound-dev#companies/autocomplete`. Use the names and values " +
            "as `filters` in `outbound-dev#companies/search` and " +
            "`outbound-dev#companies/count`.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/companies/list-company-filter-values",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/companies/filters" },
    input: { schema: { queryParams: zCompaniesFiltersQuery } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
