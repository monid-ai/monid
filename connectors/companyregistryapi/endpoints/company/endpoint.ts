import { defineEndpoint } from "@shared/core";
import { zCompanyRegistryCompanyPathParams } from "./schema/inputs.ts";

/**
 * GET /v1/companies/{company_id} — one company's registry profile by its
 * permanent Coragrid id. Inherits the provider's FREE model, keyless auth
 * and timeouts.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Company",
        summary: "Read one company's registry profile by its permanent " +
            "Coragrid id.",
        description: "Read one company's registry profile by its " +
            "permanent Coragrid id (co_...): status, legal form in the " +
            "register's own wording, registry identifiers strongest " +
            "first, activity classifications, lifecycle, as_of_date " +
            "(when the register was last observed) and the latest " +
            "register check. Take the id from a " +
            "companyregistryapi#v1/search result; this endpoint does not " +
            "look companies up by name or registry number.",
        docsUrl: "https://companyregistryapi.com/api",
        notes: [
            "Follow lifecycle.status: when it is redirected the current " +
            "record is lifecycle.canonical_id; a split record lists " +
            "lifecycle.successor_ids; a tombstoned record was withdrawn " +
            "and a restricted one is unavailable through this service.",
            "country_code is the address country. The registration " +
            "jurisdiction is the country_scope of the first scoped entry " +
            "in identifiers; the two can differ.",
            "An unknown or invisible id answers 404 `not_found`.",
        ],
    },
    request: { method: "GET", path: "/v1/companies/{company_id}" },
    input: { schema: { pathParams: zCompanyRegistryCompanyPathParams } },
});
