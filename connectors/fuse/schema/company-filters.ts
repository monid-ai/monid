import { z } from "zod";

/**
 * Fuse's company-search filters: the faithful mirror of the Business API's
 * `filters` object, shared by `fuse#companies/search` and
 * `fuse#data/companies/count`, which take the same vocabulary. Generated
 * from Fuse's published OpenAPI document; the descriptions are Fuse's own,
 * with pointers to Fuse routes this catalog does not carry left out.
 *
 * STRICT, like the API: an unknown filter key is refused with 422
 * `VALIDATION_FAILED`.
 */

const labelledEntries = (description: string) =>
    z.array(
        z.strictObject({
            value: z.string().min(1).max(500).describe(
                "The filter value; see the field's own description for its " +
                    "vocabulary.",
            ),
            label: z.string().min(1).max(500).describe(
                "Display label for the value (required; repeat the value when you" +
                    " have no label).",
            ),
            status: z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
        }),
    ).describe(description);

const strings = (description: string) =>
    z.array(z.string()).describe(description);

const nameFragments = (description: string) =>
    z.array(z.string().max(500)).describe(description);

const placeNames = (description: string) =>
    z.array(z.string().min(1).max(200)).max(25).describe(description);

const range = (description: string) =>
    z.strictObject({
        min: z.number().describe(
            "Lower bound, inclusive; except on `employeeCountV2`, whose lower" +
                " bound is exclusive (see that field). 0 or less is no bound.",
        ).optional(),
        max: z.number().describe(
            "Inclusive upper bound; 0 or less is no bound.",
        ).optional(),
    }).describe(description);

const dateRange = (description: string) =>
    z.strictObject({
        start: z.string().describe(
            "Earliest date, ISO-8601 (e.g. 2020-01-01).",
        ).optional(),
        end: z.string().describe(
            "Latest date, ISO-8601 (e.g. 2024-12-31).",
        ).optional(),
    }).describe(description);

export const zCompanyFilters = z.strictObject({
    nameLike: nameFragments(
        "Free text: company-name fragments of at most 500 chars each, " +
            "matched fuzzily against the company NAME only (never the " +
            "description). Several fragments are OR-joined (provider " +
            "`nameLike.anyOf`).",
    ).optional(),
    domains: strings(
        "Free text: company website domains (e.g. stripe.com). A scheme, " +
            "a www. prefix, a path and the letter case are all stripped " +
            "before the search, so https://www.Stripe.com/pricing and " +
            "stripe.com behave the same; a value that is not a domain at all " +
            "is dropped. Several domains are OR-joined.",
    ).optional(),
    keywords: strings(
        "Free-text keywords matched against company names and " +
            "descriptions; any may match.",
    ).optional(),
    status: labelledEntries(
        "Operating-status entries whose `value` is one of exactly: " +
            "active, acquired, closed. An off-list value is not rejected by " +
            "this API: the search comes back empty (or fails upstream) with " +
            "no error naming the field, so check the value against the list " +
            "first. Include values are OR-joined (provider `anyOf`). The " +
            "provider ignores an exclude list on this field, so an exclusion " +
            "is sent as the statuses that were NOT excluded, which also drops" +
            " companies whose status is unknown. This filter ANDs with the " +
            "others.",
    ).optional(),
    tags: labelledEntries(
        "Company-tag entries whose `value` is a slug from `companyTags` " +
            "in `fuse#companies/filter-options`: raised-from-top-vc, " +
            "venture-backed-startup, is-government, is-school. An off-list " +
            "value is not rejected by this API: the search comes back empty " +
            "(or fails upstream) with no error naming the field, so check the" +
            " value against the list first. Include values are OR-joined " +
            "(provider `anyOf`) and every exclude value is removed " +
            "(`noneOf`); this filter ANDs with the others.",
    ).optional(),
    industriesV2: labelledEntries(
        "Industry entries whose `value` is one of the `fiberIndustries` " +
            "values in `fuse#companies/filter-options`, copied exactly as " +
            "listed (e.g. Software, Finance). An off-list value is not " +
            "rejected by this API: the search comes back empty (or fails " +
            "upstream) with no error naming the field, so check the value " +
            "against the list first. Include values are OR-joined (provider " +
            "`anyOf`) and every exclude value is removed (`noneOf`); this " +
            "filter ANDs with the others.",
    ).optional(),
    linkedinIndustries: labelledEntries(
        "LinkedIn-industry entries whose `value` is one of the " +
            "`linkedinIndustries` values in `fuse#companies/filter-options`, " +
            "copied exactly as listed (e.g. Software Development); a much " +
            "finer taxonomy than `industriesV2`. An off-list value is not " +
            "rejected by this API: the search comes back empty (or fails " +
            "upstream) with no error naming the field, so check the value " +
            "against the list first. Include values are OR-joined (provider " +
            "`anyOf`) and every exclude value is removed (`noneOf`); this " +
            "filter ANDs with the others.",
    ).optional(),
    crunchbaseCategories: labelledEntries(
        "Crunchbase-category entries whose `value` is one of the " +
            "`crunchbaseIndustries` values in " +
            "`fuse#companies/filter-options`, copied exactly as listed (e.g. " +
            "Financial Services). An off-list value is not rejected by this " +
            "API: the search comes back empty (or fails upstream) with no " +
            "error naming the field, so check the value against the list " +
            "first. Include values are OR-joined (provider `anyOf`) and every" +
            " exclude value is removed (`noneOf`); this filter ANDs with the " +
            "others.",
    ).optional(),
    crunchbaseCategoryGroups: strings(
        "Crunchbase category groups as plain strings copied verbatim " +
            "(case-sensitive) from `crunchbaseCategoryGroups` in " +
            "`fuse#companies/filter-options` (e.g. Financial Services); the " +
            "broad parent of `crunchbaseCategories`. An off-list value is not" +
            " rejected by this API: the search comes back empty (or fails " +
            "upstream) with no error naming the field, so check the value " +
            "against the list first. Several groups are OR-joined (provider " +
            "`anyOf`); this filter has no exclude form.",
    ).optional(),
    naicsCodes: labelledEntries(
        "NAICS entries whose `value` is the code, not the title " +
            "(`naicsCodes[].code` in `fuse#companies/filter-options`, e.g. " +
            "513210 for Software Publishers; 2- to 6-digit codes are all " +
            "accepted, a shorter code being the broader sector). An off-list " +
            "value is not rejected by this API: the search comes back empty " +
            "(or fails upstream) with no error naming the field, so check the" +
            " value against the list first. Include values are OR-joined " +
            "(provider `anyOf`) and every exclude value is removed " +
            "(`noneOf`); this filter ANDs with the others.",
    ).optional(),
    headquartersCountryCode: labelledEntries(
        "Headquarters-country entries whose `value` is the country's " +
            "three-letter `apiCode` from `countries` in " +
            "`fuse#companies/filter-options` (e.g. USA, DEU). The two-letter " +
            "`isoCodeAlpha2` in the same row (US, DE) is also accepted and " +
            "converted to the `apiCode`. Any other off-list value is not " +
            "rejected by this API: the search comes back empty (or fails " +
            "upstream) with no error naming the field, so check the value " +
            "against the list first. Include values are OR-joined (provider " +
            "`anyOf`) and every exclude value is removed (`noneOf`); this " +
            "filter ANDs with the others.",
    ).optional(),
    headquartersStateName: labelledEntries(
        "Headquarters state/province entries whose `value` is the full " +
            "state or province name (e.g. Florida, California).",
    ).optional(),
    headquartersCity: placeNames(
        "Up to 25 fully qualified place names (e.g. Dallas, Texas, United" +
            " States); each is geocoded independently to its city bounds and " +
            "the areas are OR-ed together (no exclusion). A name that " +
            "geocodes to nothing is dropped and the search runs on the names " +
            "that did resolve, and only when NOT ONE of them resolves is the " +
            "search refused rather than run worldwide (422 " +
            "CITY_FILTER_UNRESOLVED).",
    ).optional(),
    employeeCountV2: range(
        "Headcount range `{ min?, max? }`; any whole number is taken on " +
            "either side and is used as sent; the values the search UI offers" +
            " (1, 10, 50, 200, 500, 1000, 5000, 10000) are its own " +
            "vocabulary, not a constraint here. The lower bound is EXCLUSIVE " +
            "and the upper bound inclusive, so `{ min: 50 }` matches " +
            "companies with MORE than 50 employees, and `{ min: 300, max: 320" +
            " }` matches 301 to 320. Inverted bounds are read the other way " +
            "round, and an equal pair keeps only the lower bound, because the" +
            " provider rejects a range whose bounds meet.",
    ).optional(),
    revenueUSD: range(
        "Estimated annual revenue range `{ min?, max? }`; the accepted " +
            "values are whole US dollars, not millions (5000000 means $5M), " +
            "and both bounds are inclusive.",
    ).optional(),
    totalFundingUSD: range(
        "Total funding raised range `{ min?, max? }`; the accepted values" +
            " are whole US dollars, not millions (5000000 means $5M), and " +
            "both bounds are inclusive.",
    ).optional(),
    lastFundingUSD: range(
        "Size range of the most recent funding round `{ min?, max? }`; " +
            "the accepted values are whole US dollars, not millions (5000000 " +
            "means $5M), and both bounds are inclusive.",
    ).optional(),
    stage: labelledEntries(
        "Funding-stage entries whose `value` is one of exactly: pre_seed," +
            " seed, series_a, series_b, series_c, series_d, series_e, " +
            "series_f, series_g, series_h, series_i, series_j, public, " +
            "acquired, closed, private_equity, venture_other, no_funding_yet," +
            " unknown. No endpoint serves this list; it is fixed here. An " +
            "off-list value is not rejected by this API: the search comes " +
            "back empty (or fails upstream) with no error naming the field, " +
            "so check the value against the list first. Include values are " +
            "OR-joined (provider `anyOf`) and every exclude value is removed " +
            "(`noneOf`); this filter ANDs with the others.",
    ).optional(),
    technologies: labelledEntries(
        "Technology-in-use entries whose `value` is a name from the " +
            "provider's predefined technology vocabulary, forwarded verbatim," +
            " so it must carry the product's own spelling and casing; e.g. " +
            "Salesforce, Kubernetes, Next.js, Google Analytics, and `AWS` for" +
            " Amazon Web Services. No endpoint serves this vocabulary yet; " +
            "the product's own picker offers a curated 141-name subset. An " +
            "off-list value is not rejected by this API: the search comes " +
            "back empty (or fails upstream) with no error naming the field, " +
            "so check the value against the list first. Include values are " +
            "OR-joined (provider `anyOf`) and every exclude value is removed " +
            "(`noneOf`); this filter ANDs with the others.",
    ).optional(),
    investors: labelledEntries(
        "Investor entries whose `value` is the investor's website domain," +
            " never the investor's name: `fuse#data/companies/resolve` finds " +
            "a firm's domain from its name. An off-list value is not rejected" +
            " by this API: the search comes back empty (or fails upstream) " +
            "with no error naming the field, so check the value against the " +
            "list first. Include values are OR-joined (provider `anyOf`) and " +
            "every exclude value is removed (`noneOf`); this filter ANDs with" +
            " the others.",
    ).optional(),
    foundedOn: dateRange(
        "Founding-date range `{ start?, end? }` as ISO-8601 dates.",
    ).optional(),
    lastFundedOn: dateRange(
        "Date range of the most recent funding round, `{ start?, end? }` " +
            "as ISO-8601 dates.",
    ).optional(),
    acceleratorsV2: labelledEntries(
        "Accelerator entries whose `value` is the `acceleratorSlug` from " +
            "`accelerators` in `fuse#companies/filter-options` (e.g. " +
            "ycombinator, techstars); the `acceleratorName` in the same row " +
            "is NOT accepted. An off-list value is not rejected by this API: " +
            "the search comes back empty (or fails upstream) with no error " +
            "naming the field, so check the value against the list first. " +
            "Include values are OR-joined (provider `anyOf`) and every " +
            "exclude value is removed (`noneOf`); this filter ANDs with the " +
            "others.",
    ).optional(),
    fortuneRankings: labelledEntries(
        "Fortune-list entries whose `value` is one of exactly: " +
            "fortune-500, fortune-1000 (fortune-1000 contains fortune-500). " +
            "Any other value is silently DROPPED and the whole filter " +
            "disappears, so the search then runs with no ranking constraint " +
            "at all rather than returning nothing. Include values are " +
            "OR-joined (provider `anyOf`). The provider takes an include list" +
            " only here, and the tiers nest, so an exclude value cannot be " +
            "honoured and is ignored. This filter ANDs with the others.",
    ).optional(),
    officeLocationsV2: labelledEntries(
        "Office-location entries whose `value` is a country's " +
            "three-letter `apiCode` from `countries` in " +
            "`fuse#companies/filter-options` (e.g. USA); the same vocabulary " +
            "as `headquartersCountryCode`, but matching ANY office rather " +
            "than only the headquarters. The two-letter `isoCodeAlpha2` (US) " +
            "is also accepted and converted to the `apiCode`. Any other " +
            "off-list value is not rejected by this API: the search comes " +
            "back empty (or fails upstream) with no error naming the field, " +
            "so check the value against the list first. Include values are " +
            "OR-joined (provider `anyOf`) and every exclude value is removed " +
            "(`noneOf`); this filter ANDs with the others.",
    ).optional(),
    linkedinSlugs: strings(
        "Free text: LinkedIn company slugs (e.g. stripe). A full company " +
            "URL is accepted and reduced to the part after " +
            "linkedin.com/company/, and the value is lower-cased, because the" +
            " provider matches the slug exactly. Several slugs are OR-joined.",
    ).optional(),
});
