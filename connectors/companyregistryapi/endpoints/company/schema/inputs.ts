import { z } from "zod";

/**
 * GET /v1/companies/{company_id} path parameters — OpenAPI `getCompany`
 * (https://companyregistryapi.com/api/openapi.json, read 2026-11-07),
 * components CompanyId parameter and schema. Faithful mirror (D25): the
 * published pattern; the API answers 400 for anything else, uppercase
 * included.
 */
export const zCompanyRegistryCompanyPathParams = z.strictObject({
    company_id: z.string().regex(/^co_[0-7][0-9a-hj-km-np-tv-z]{25}$/)
        .describe(
            "A permanent Coragrid company ID such as " +
                "co_014d2pf2dbsqqg28t5cy4tqkff, as returned in a search " +
                "result's id. Names and registry numbers change and " +
                "repeat; the ID does not.",
        ),
});
