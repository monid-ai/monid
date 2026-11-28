import { z } from "zod";

const zCountryCodes = z.string().max(1000).regex(
    /^[A-Za-z]{2,3}(\s*,\s*[A-Za-z]{2,3})*$/,
);

/** `GET /companies/autocomplete` query — the mirror of outbound.dev's
 *  published parameters (design D25). STRICTER than the API on one point: it
 *  drops an unknown query key unread, and this refuses it. outbound.dev
 *  also refuses `orgType` without `field=company`, and the two country lists
 *  without `field=state`, with 422 (meta.notes). */
export const zCompaniesAutocompleteQuery = z.strictObject({
    field: z.enum(["company", "location", "state"]).describe(
        "What to suggest: company names (`company`), headquarters cities " +
            "(`location`) or states (`state`).",
    ),
    q: z.string().min(2).max(200).describe(
        "What has been typed so far, two characters or more, e.g. `mae`.",
    ),
    orgType: z.enum(["investor"]).describe(
        "`investor` narrows `field=company` to investors, for the " +
            "`investors` filter. Only with `field=company`.",
    ).optional(),
    countries: zCountryCodes.describe(
        "Only with `field=state`: comma-separated countries whose states " +
            "to suggest, as `USA` or `US`. Without it, every country's.",
    ).optional(),
    excludedCountries: zCountryCodes.describe(
        "Only with `field=state`: comma-separated countries whose states " +
            "to leave out.",
    ).optional(),
});
