import { z } from "zod";
import { zPeopleFilters } from "../../../schema/people-filters.ts";

const zCountPeopleFields = z.strictObject({
    filters: zPeopleFilters.describe(
        "The people to count, in the same vocabulary as " +
            "`fuse#prospects/search`; `fuse#prospects/filter-options` lists " +
            "every field and its accepted values. A value outside a field's " +
            "list is refused with 422 VALIDATION_FAILED. Must contain at " +
            "least one non-empty value.",
    ).optional(),
    query: z.string().min(1).max(2000).describe(
        "Natural-language description of who to count (max 2000 chars), " +
            'e.g. "VPs of sales at fintech companies in New York", ' +
            "converted into filters server-side; criteria that could not be " +
            "mapped come back as `unresolvedCriteria`, and a query yielding " +
            "no filter answers 422 QUERY_FILTERS_INVALID.",
    ).optional(),
});

/**
 * `POST /data/people/count` body — the mirror of Fuse's published request
 * (design D25). Fuse takes EXACTLY ONE of `filters` or `query`, so each arm
 * requires its own field and omits the other.
 */
export const zCountPeopleBody = z.union([
    zCountPeopleFields.required({ filters: true }).omit({ query: true }),
    zCountPeopleFields.required({ query: true }).omit({ filters: true }),
]);
