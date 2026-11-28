import { z } from "zod";
import { zSearchFilters } from "../../../schema/search.ts";

const zCountCompaniesFields = z.strictObject({
    query: z.string().min(1).max(2000).describe(
        "Which companies to count, in plain English (max 2000 chars), e.g. " +
            '"logistics companies in Portugal". It is turned into filters, ' +
            "which the answer carries as `filters`.",
    ).optional(),
    filters: zSearchFilters.describe(
        "The companies to count, as `outbound-dev#companies/search` takes " +
            "`filters`; `outbound-dev#companies/filters` lists the values " +
            "each filter accepts.",
    ).optional(),
});

/**
 * `POST /companies/count` body — the mirror of outbound.dev's published
 * request (design D25). outbound.dev takes EXACTLY ONE of `query` or
 * `filters`, so each arm requires its own field and omits the other. The
 * saved-search sources are not exposed, as on the search.
 */
export const zCountCompaniesBody = z.union([
    zCountCompaniesFields.required({ query: true }).omit({ filters: true }),
    zCountCompaniesFields.required({ filters: true }).omit({ query: true }),
]);
