import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPeopleFiltersQuery } from "./schema/inputs.ts";

/** `GET /people/filters` — the filters the people search takes and the
 *  values each accepts, free. A static vocabulary: no tenant data, nothing
 *  charged. */
export default defineEndpoint({
    meta: {
        displayName: "People Search Filters",
        summary:
            "List every people search filter and the values it accepts, such as departments and seniorities.",
        description: "List every people search filter and the values it " +
            "accepts, such as departments (`job_title_role`), seniorities " +
            "(`job_title_levels`), industries and countries. Free. Send " +
            "`field` for one filter alone; without it every filter comes " +
            "back. `fields.<name>.values` lists the accepted `{label, " +
            "value}` pairs: send `value`. A free-text filter such as " +
            "`job_title` has no fixed values: its `autocomplete` names the " +
            "query that suggests them, served here by " +
            "`outbound-dev#people/autocomplete`. `jobTitleRoleToSubRole` " +
            "lists each department's sub-departments. Use the names and " +
            "values as `filters` in `outbound-dev#people/search`, " +
            "`outbound-dev#people/count` and `outbound-dev#companies/people`.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/people/list-people-filter-values",
        categories: ["people-enrichment"],
    },
    request: { method: "GET", path: "/people/filters" },
    input: { schema: { queryParams: zPeopleFiltersQuery } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
