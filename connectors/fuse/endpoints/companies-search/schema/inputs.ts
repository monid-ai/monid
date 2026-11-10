import { z } from "zod";
import { zCompanyFilters } from "../../../schema/company-filters.ts";

const zSearchCompaniesFields = z.strictObject({
    filters: zCompanyFilters.describe(
        "Company filters, instead of `query`. Include/exclude fields take " +
            "`[{status, value, label}]` entries (`label` is required), list " +
            "fields arrays of strings, ranges `{min, max}` and date ranges " +
            "`{start, end}`; enum vocabularies come from " +
            "`fuse#companies/filter-options`. Must contain at least one " +
            "non-empty value.",
    ).optional(),
    query: z.string().min(1).max(2000).describe(
        "Natural-language description of the companies to find (max 2000 " +
            "chars), converted into filters server-side instead of " +
            "`filters`; criteria that could not be mapped come back as " +
            "`unresolvedCriteria`, and a query yielding no filter answers 422 " +
            "QUERY_FILTERS_INVALID.",
    ).optional(),
    size: z.number().int().min(1).max(100).describe(
        "Companies per page (1-100, default 25). Charged per company " +
            "returned, so a short page costs less.",
    ).optional(),
    cursor: z.string().nullable().describe(
        "The `nextCursor` the previous page returned, sent with that " +
            "page's returned `filters`; null (the default) starts from the " +
            "first page.",
    ).optional(),
});

/**
 * `POST /companies/search` body — the mirror of Fuse's published request
 * (design D25), STRICT like the API. Fuse takes EXACTLY ONE filter source,
 * so each arm requires its own field and omits the other.
 *
 * `savedSearchId` and `savedSearchName` are NOT EXPOSED: they read searches
 * saved in the Fuse workspace that holds the key, one workspace shared by
 * every caller on a broker.
 */
export const zSearchCompaniesBody = z.union([
    zSearchCompaniesFields.required({ filters: true }).omit({ query: true }),
    zSearchCompaniesFields.required({ query: true }).omit({ filters: true }),
]);
