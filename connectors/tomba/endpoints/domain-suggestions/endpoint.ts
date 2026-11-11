import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zDomainSuggestionsQueryParams } from "./schema/inputs.ts";

/** GET /domain-suggestions — company name → domain autocomplete (free). */
export default defineEndpoint({
    meta: {
        displayName: "Suggest Company Domains",
        summary:
            "Turn a partial company name into matching companies with their domains.",
        description: "Return up to five companies whose name or domain " +
            "matches a query, each with its domain and the number of email " +
            "addresses Tomba has for it. Suited for turning a company name " +
            "into a domain before /domain-search or /email-finder, and for " +
            "autocomplete. Free.",
        docsUrl:
            "https://docs.tomba.io/api/domain-suggestions#get-domain-suggestions",
        categories: ["company-enrichment"],
        notes: [
            "When nothing matches, `data` is an empty array; if the lookup " +
            "fails, `data` is null.",
        ],
    },
    request: { method: "GET", path: "/domain-suggestions" },
    input: {
        schema: {
            queryParams: zDomainSuggestionsQueryParams.required({
                query: true,
            }),
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
