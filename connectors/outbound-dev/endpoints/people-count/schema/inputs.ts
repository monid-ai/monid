import { z } from "zod";
import { zSearchFilters } from "../../../schema/search.ts";

const zCountPeopleFields = z.strictObject({
    query: z.string().min(1).max(2000).describe(
        "Who to count, in plain English (max 2000 chars), e.g. " +
            '"operations directors at logistics companies in Portugal". It ' +
            "is turned into filters, which the answer carries as `filters`.",
    ).optional(),
    filters: zSearchFilters.describe(
        "The people to count, as `outbound-dev#people/search` takes " +
            "`filters`; `outbound-dev#people/filters` lists every filter " +
            "and the values it accepts.",
    ).optional(),
});

/**
 * `POST /people/count` body — the mirror of outbound.dev's published request
 * (design D25). outbound.dev takes EXACTLY ONE of `query` or `filters`, so
 * each arm requires its own field and omits the other. The saved-search
 * sources are not exposed, as on the search.
 */
export const zCountPeopleBody = z.union([
    zCountPeopleFields.required({ query: true }).omit({ filters: true }),
    zCountPeopleFields.required({ filters: true }).omit({ query: true }),
]);
