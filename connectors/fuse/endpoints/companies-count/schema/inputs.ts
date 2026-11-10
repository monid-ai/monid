import { z } from "zod";
import { zCompanyFilters } from "../../../schema/company-filters.ts";

const zCountCompaniesFields = z.strictObject({
    filters: zCompanyFilters.describe(
        "The companies to count, in the same vocabulary as " +
            "`fuse#companies/search`; enum vocabularies come from " +
            "`fuse#companies/filter-options`. Must contain at least one " +
            "non-empty value.",
    ).optional(),
    query: z.string().min(1).max(2000).describe(
        "Natural-language description of the companies to count (max 2000 " +
            'chars), e.g. "Series B fintech companies in New York with 50 to ' +
            '200 employees", converted into filters server-side; criteria ' +
            "that could not be mapped come back as `unresolvedCriteria`, and " +
            "a query yielding no filter answers 422 QUERY_FILTERS_INVALID.",
    ).optional(),
});

/**
 * `POST /data/companies/count` body — the mirror of Fuse's published
 * request (design D25). Fuse takes EXACTLY ONE of `filters` or `query`, so
 * each arm requires its own field and omits the other.
 */
export const zCountCompaniesBody = z.union([
    zCountCompaniesFields.required({ filters: true }).omit({ query: true }),
    zCountCompaniesFields.required({ query: true }).omit({ filters: true }),
]);
