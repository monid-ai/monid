import { z } from "zod";
import { zSearchCursor, zSearchFilters } from "../../../schema/search.ts";

/**
 * `POST /people/search` body — the mirror of outbound.dev's published
 * request (design D25), STRICT like the API. `limit`'s vendor default (10)
 * is applied at the binding.
 *
 * `savedSearchId` and `savedSearchName` are NOT EXPOSED: they read searches
 * saved in the outbound.dev workspace that holds the key, one workspace
 * shared by every caller on a broker.
 */
export const zSearchPeopleBody = z.strictObject({
    query: z.string().min(1).max(2000).describe(
        "Who to find, in plain English (max 2000 chars), e.g. " +
            '"operations directors at logistics companies in Portugal". It ' +
            "is turned into filters, which the page answers with as " +
            "`filters`; parts no filter could express come back as " +
            "`unresolvedCriteria`. Send this or `filters`, not both.",
    ).optional(),
    filters: zSearchFilters.describe(
        "People filters by name, instead of `query`, e.g. " +
            '`{"job_title_levels": ["director", "vp"], "job_title_role": ' +
            '["operations"]}`. `outbound-dev#people/filters` lists every ' +
            "filter and the values it accepts, and " +
            "`outbound-dev#people/autocomplete` suggests values for the " +
            "free-text ones (job title, company, location, school, skill). " +
            "A name or value the search does not take is refused with 422, " +
            "named in `param`, before anything is charged.",
    ).optional(),
    linkedinUrl: z.string().min(1).max(2048).describe(
        "Look up one person by a LinkedIn profile URL, `in/<slug>` or the " +
            "bare slug. It counts as a search on its own, or narrows one. " +
            "Send it again with `cursor` on later pages.",
    ).optional(),
    limit: z.number().int().min(1).max(100).describe(
        "People per page (1-100, default 10). Charged per person returned, " +
            "so a short page costs less.",
    ).optional(),
    cursor: zSearchCursor.describe(
        "The `pagination.nextCursor` of the page before, sent with the " +
            "`filters` that page answered with, for the next page.",
    ).optional(),
});
