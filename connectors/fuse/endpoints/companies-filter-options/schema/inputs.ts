import { z } from "zod";

/** `GET /companies/filter-options` query — the mirror of Fuse's published
 *  `field` parameter (design D25), STRICT like the API. */
export const zCompanyFilterOptionsQuery = z.strictObject({
    field: z.enum([
        "nameLike",
        "domains",
        "keywords",
        "status",
        "tags",
        "industriesV2",
        "linkedinIndustries",
        "crunchbaseCategories",
        "crunchbaseCategoryGroups",
        "naicsCodes",
        "headquartersCountryCode",
        "headquartersStateName",
        "headquartersCity",
        "employeeCountV2",
        "revenueUSD",
        "totalFundingUSD",
        "lastFundingUSD",
        "stage",
        "technologies",
        "investors",
        "foundedOn",
        "lastFundedOn",
        "acceleratorsV2",
        "fortuneRankings",
        "officeLocationsV2",
        "linkedinSlugs",
    ]).describe(
        "One filter to answer for, by the name it is sent under in " +
            "`filters` (e.g. `industriesV2`); omitted, every list is " +
            "answered.",
    ).optional(),
});
