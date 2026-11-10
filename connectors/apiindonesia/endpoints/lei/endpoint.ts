import { defineEndpoint } from "@shared/core";
import { zLeiQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/lei. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia LEI Entity Search",
        summary:
            "Search Legal Entity Identifiers (LEI) for Indonesian companies.",
        description:
            "Search the GLEIF golden copy, filtered to entities with an Indonesian " +
            "legal or headquarters address, by legal or transliterated name and by " +
            "entity status, registration status, city or province. Each result has " +
            "the 20-character LEI, legal name, statuses, legal form and legal and " +
            "headquarters city and region. Use it to find a listed or " +
            "financial-sector Indonesian company's LEI for KYC or reporting. Only " +
            "entities that hold an LEI appear, so small businesses usually do not.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#lei",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/lei" },
    input: { schema: { queryParams: zLeiQueryParams } },
});
