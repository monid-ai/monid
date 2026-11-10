import { z } from "zod";
import { zPeopleFilters } from "../../../schema/people-filters.ts";

/**
 * `POST /prospects/search` body — the mirror of Fuse's published request
 * (design D25), STRICT like the API. `size`'s vendor default (10) is applied
 * at the binding.
 *
 * `savedSearchId` and `savedSearchName` are NOT EXPOSED: they read searches
 * saved in the Fuse workspace that holds the key, one workspace shared by
 * every caller on a broker.
 */
export const zSearchPeopleBody = z.strictObject({
    filters: zPeopleFilters.describe(
        "People filters, instead of `query`. Include/exclude fields take " +
            "`[{status, value}]` entries, term fields a string or an array " +
            "of strings, and `rangeInputs` `{min, max}` ranges; " +
            "`fuse#prospects/filter-options` lists every field and its " +
            "accepted values. A value outside a field's list is refused with " +
            "422 VALIDATION_FAILED, naming the field and the value, before " +
            "anything is charged; so is an `exclude` entry on " +
            "`education.degrees`, which takes includes only. " +
            "`languages.name` also accepts these other names of listed " +
            "languages, searched as the listed one: bangla, farsi, panjabi, " +
            "slovene, chinese, mandarin, putonghua, tagalog, filipino, " +
            "sinhala, khmer, central khmer, hakka chinese, hokkien, " +
            "taiwanese, newari, northern frisian, western frisian, ndebele, " +
            "north ndebele, south ndebele, assyrian neo-aramaic.",
    ).optional(),
    query: z.string().min(1).max(2000).describe(
        "Natural-language description of who to find (max 2000 chars), " +
            "converted into filters server-side instead of `filters`; " +
            "criteria that could not be mapped come back as " +
            "`unresolvedCriteria`, and a query yielding no filter answers 422 " +
            "QUERY_FILTERS_INVALID.",
    ).optional(),
    size: z.number().int().min(1).max(100).describe(
        "Profiles per page (1-100, default 10). Charged per profile " +
            "returned, so a short page costs less.",
    ).optional(),
    scrollToken: z.string().describe(
        "The `scrollToken` the previous page returned, sent with that " +
            "page's returned `filters` to fetch the next page. A token Fuse " +
            "did not issue answers 422 SCROLL_TOKEN_INVALID: start again " +
            "without it.",
    ).optional(),
    linkedinUrl: z.string().describe(
        "A LinkedIn profile URL (or `in/<slug>`, or the bare slug) to look " +
            "up one person, normalised before matching; counts as search " +
            "criteria on its own. A value that names no profile answers 422 " +
            "FILTER_VALUE_UNRESOLVED with `param` linkedinUrl.",
    ).optional(),
});
