import { z } from "zod";

/** `GET /companies/filters` query — the mirror of outbound.dev's published
 *  `field` parameter (design D25). STRICTER than the API, which drops an
 *  unknown query key unread: a misspelled key is refused here rather than
 *  answered with every filter. */
export const zCompaniesFiltersQuery = z.strictObject({
    field: z.string().min(1).max(100).describe(
        "One filter to answer for, by its name, e.g. " +
            "`headquartersCountryCode`; omitted, every filter is answered.",
    ).optional(),
});
