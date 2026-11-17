import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchOrganizationsCountBody } from "./schema/inputs.ts";

/** POST /v2/search/organizations/count: the size of an Organization
 *  Search, free. */
export default defineEndpoint({
    meta: {
        displayName: "Count Organizations",
        summary: "Count the companies matching Organization Search " +
            "filters, for free.",
        description: "Count the organizations matching a set of " +
            "Organization Search filters without returning any profile. " +
            "Takes exactly the filters of " +
            "`reversecontact#v2/search/organizations`, without `cursor` " +
            "or `perPage`, and returns `data.count`. Use it to size a " +
            "market or tighten filters before running the paid search. " +
            "Free.",
        docsUrl:
            "https://docs.reversecontact.com/endpoints/search-organizations-count",
        categories: ["company-enrichment"],
        notes: [
            "At least one filter is required, and `maxDataAgeDate` cannot " +
            "be the only one (422).",
        ],
    },
    request: { method: "POST", path: "/v2/search/organizations/count" },
    input: { schema: { body: zSearchOrganizationsCountBody } },
    timeouts: { requestMs: 40_000, runMs: 45_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
