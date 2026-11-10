import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompanyFilterOptionsQuery } from "./schema/inputs.ts";

/**
 * `GET /companies/filter-options` — the accepted values of every enum-backed
 * company filter, free. A static vocabulary: no tenant data, nothing
 * charged.
 *
 * With `field`, Fuse marks `headquartersCity` and `investors` with an
 * `autocomplete` pointer to its autocomplete route, which this connector
 * does not carry, so `fromResponse` drops the pointer.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Company Search Filter Values",
        summary:
            "Get the accepted values for one company-search filter, or for all of them, free.",
        description: "Get the valid values for one company-search filter " +
            "(industry, funding stage, country, NAICS code, tag, " +
            "accelerator) or for all of them. Free. Send `field` with the " +
            "name a filter is sent under, e.g. `industriesV2`: the answer is " +
            "`filterOptions.fields.<field>`, whose `valueShape` is " +
            "`include_exclude`, `term`, `range` or `date_range` and whose " +
            "`values` are the accepted `{label, value}` pairs (send both, as " +
            "`value` and `label`). Without `field`, every list comes back: " +
            "`fiberIndustries` for `industriesV2`, `linkedinIndustries`, " +
            "`crunchbaseIndustries` for `crunchbaseCategories`, " +
            "`crunchbaseCategoryGroups` (case-sensitive, copy them " +
            "verbatim), `companyTags` for `tags`, `naicsCodes[].code`, " +
            "`countries[].apiCode` for `headquartersCountryCode` and " +
            "`officeLocationsV2`, `accelerators[].acceleratorSlug` for " +
            "`acceleratorsV2`, `fundingStages` for `stage`, `statuses` for " +
            "`status` and `fortuneRankings`. `technologies` has no served " +
            "vocabulary; its filter description names the accepted values. " +
            "Values off a list are refused by `fuse#companies/search` " +
            "before anything is charged.",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/companies/filter-options" },
    input: { schema: { queryParams: zCompanyFilterOptionsQuery } },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["autocomplete"]),
    },
});
