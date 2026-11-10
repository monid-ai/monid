import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPeopleFilterOptionsQuery } from "./schema/inputs.ts";

/**
 * `GET /prospects/filter-options` — the accepted values of every people
 * filter, free. A static vocabulary: no tenant data, nothing charged.
 *
 * Fuse marks free-text fields with an `autocomplete` pointer to its
 * autocomplete route, which this connector does not carry, so
 * `fromResponse` drops the pointer rather than hand the caller a route it
 * cannot call.
 */
export default defineEndpoint({
    meta: {
        displayName: "List People Search Filter Values",
        summary:
            "Get the accepted values for one people-search filter, or for all of them, free.",
        description: "Get the valid values for one people-search filter " +
            "(seniority, department, industry, country, company size, " +
            "revenue, language, degree) or for all of them. Free. Send " +
            "`field`, e.g. `job_title_levels`, for that filter alone; " +
            "without it the whole contract comes back, all 33 filters " +
            "(about 68 KB). `filterOptions.fields.<field>.valueShape` says " +
            "how the value is sent: `include_exclude` takes `[{status, " +
            "value}]` entries or bare strings (bare strings are includes), " +
            "and `term` takes a string or an array of strings. `values` " +
            "lists the accepted `{label, value}` pairs: send `value`. " +
            "Free-text fields such as `job_title` or `location_name` have no " +
            "vocabulary and come back with `values: []`. Without `field`, " +
            "`jobTitleRoleToSubRole` maps every `job_title_role` to its " +
            "sub-roles. Values outside a field's list match nothing, so " +
            "`fuse#prospects/search` and `fuse#data/people/count` refuse " +
            "them before anything is charged.",
        categories: ["people-enrichment"],
    },
    request: { method: "GET", path: "/prospects/filter-options" },
    input: { schema: { queryParams: zPeopleFilterOptionsQuery } },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["autocomplete"]),
    },
});
