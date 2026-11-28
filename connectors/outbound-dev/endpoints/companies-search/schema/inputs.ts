import { z } from "zod";
import { zSearchCursor, zSearchFilters } from "../../../schema/search.ts";

/**
 * `POST /companies/search` body — the mirror of outbound.dev's published
 * request (design D25), STRICT like the API. `limit`'s vendor default (25)
 * is applied at the binding.
 *
 * `savedSearchId` and `savedSearchName` are NOT EXPOSED: they read searches
 * saved in the outbound.dev workspace that holds the key, one workspace
 * shared by every caller on a broker.
 */
export const zSearchCompaniesBody = z.strictObject({
    query: z.string().min(1).max(2000).describe(
        "Which companies to find, in plain English (max 2000 chars), e.g. " +
            '"logistics companies in Portugal". It is turned into filters, ' +
            "which the page answers with as `filters`; parts no filter " +
            "could express come back as `unresolvedCriteria`. Send this or " +
            "`filters`, not both.",
    ).optional(),
    filters: zSearchFilters.describe(
        "Company filters by name, instead of `query`, e.g. " +
            '`{"headquartersCountryCode": ["PRT"]}`. ' +
            "`outbound-dev#companies/filters` lists the values each filter " +
            "accepts (industries, countries, funding stages, technologies), " +
            "and `outbound-dev#companies/autocomplete` suggests company " +
            "names, headquarters cities and states. A name or value the " +
            "search does not take is refused with 422, named in `param`, " +
            "before anything is charged.",
    ).optional(),
    limit: z.number().int().min(1).max(100).describe(
        "Companies per page (1-100, default 25). Charged per company " +
            "returned, so a short page costs less.",
    ).optional(),
    cursor: zSearchCursor.describe(
        "The `pagination.nextCursor` of the page before, sent with the " +
            "`filters` that page answered with, for the next page.",
    ).optional(),
});
