import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFilterOptionsBody } from "./schema/inputs.ts";

/** POST /v1/filters/options — allowed values for list-generation filter
 *  keys. Free. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Filter Options",
        summary: "Allowed values for company list filter keys. Free.",
        description: "Get the exact allowed values for one or more company " +
            "list-generation filters — countries, regions, industry and " +
            "NAICS/SIC codes, funding stages, round types, revenue and " +
            "valuation bands, ownership, go-to-market motion, revenue " +
            "model, AI maturity, partnership types, investor uuids, and " +
            "more. Pass the filter keys from the Filters List endpoint as " +
            "'dropdown_type' values. Free — consumes no credits.",
        docsUrl: "https://agent-docs.akta.pro/api-reference/filters-options",
        categories: ["company-enrichment"],
    },
    request: { method: "POST", path: "/v1/filters/options/" },
    input: { schema: { body: zFilterOptionsBody } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
