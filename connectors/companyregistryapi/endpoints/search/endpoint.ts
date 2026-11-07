import { defineEndpoint } from "@shared/core";
import { zCompanyRegistrySearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/search — companies whose name or business ID starts with `q`,
 * in registry name order. Inherits the provider's FREE model, keyless
 * auth and timeouts.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Companies",
        summary: "Search official company registers by the start of a " +
            "company name or a business ID.",
        description: "Search official company registers by the start of " +
            "a company name or a business ID, optionally in one address " +
            "country or registration jurisdiction. Results come in " +
            "registry name order with no relevance score, each with its " +
            "permanent id, name and address country (country_code) and, " +
            "when the register publishes them, status and type; registry " +
            "identifiers are on the company resource, not here, so read " +
            "a result's id with companyregistryapi#v1/companies/{company_id} " +
            "for those. A next_cursor that is not null means more pages " +
            "exist. Search for the start of a name, never a description: " +
            "this is a register lookup, not semantic search or " +
            "enrichment by domain.",
        docsUrl: "https://companyregistryapi.com/api",
        notes: [
            "An empty result is not proof a company does not exist: the " +
            "registers covered differ by country, and the match is on " +
            "the start of the name or business ID only.",
            "To page, send next_cursor as cursor with the same q, " +
            "filters and limit. Cursors expire in about 15 minutes; a " +
            "400 on a cursor means start again from the first page.",
            "address_country is where the company's address is; " +
            "jurisdiction is where it is registered. The two can differ, " +
            "and a company may have no address country.",
        ],
    },
    request: { method: "GET", path: "/v1/search" },
    input: { schema: { queryParams: zCompanyRegistrySearchQueryParams } },
});
