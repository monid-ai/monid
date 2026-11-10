import { z } from "zod";

/**
 * Fuse's people-search filters: the faithful mirror of the Business API's
 * `filters` object, shared by `fuse#prospects/search` and
 * `fuse#data/people/count`, which take the same vocabulary. Generated from
 * Fuse's published OpenAPI document; the descriptions are Fuse's own, with
 * pointers to Fuse routes this catalog does not carry left out.
 *
 * STRICT, like the API: an unknown filter key, or a filter the search no
 * longer serves, is refused with 422 `VALIDATION_FAILED`.
 */

/** One include/exclude entry; a bare string in the same list is an include. */
const zEntry = z.strictObject({
    status: z.enum(["include", "exclude"]).describe(
        "`include` matches the value; `exclude` removes profiles carrying" +
            " it (includes OR together, every exclude applies).",
    ),
    value: z.string().max(500).describe(
        "The filter value (max 500 chars); for enum-backed fields use a " +
            "value `fuse#prospects/filter-options` lists for the field; other" +
            " values match nothing.",
    ),
    label: z.string().max(500).describe(
        "Optional display label as returned by " +
            "`fuse#prospects/filter-options`; accepted and ignored.",
    ).optional(),
    liOrgId: z.string().min(1).max(32).describe(
        "Company filters only: the company's LinkedIn organization id.",
    ).optional(),
    domain: z.string().min(1).max(500).describe(
        "Company filters only: the company's website domain (e.g. " +
            "stripe.com).",
    ).optional(),
});

const includeExclude = (description: string) =>
    z.union([
        z.string().max(500),
        z.array(z.union([z.string().max(500), zEntry])).max(1000),
    ]).describe(description);

/** Past employers take includes only. */
const includeOnlyCompany = (description: string) =>
    z.union([
        z.string().min(1).max(500),
        z.array(
            z.union([
                z.string().min(1).max(500),
                zEntry.extend({ status: z.enum(["include"]) }),
            ]),
        ).max(1000),
    ]).describe(description);

const term = (description: string) =>
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
        .describe(description);

const contactLookup = (description: string) =>
    z.union([
        z.string().min(1).max(254),
        z.array(z.string().min(1).max(254)).max(10),
    ]).describe(description);

const titleWords = (description: string) =>
    z.array(z.string().min(1).max(200)).max(50).describe(description);

const range = (description: string) =>
    z.strictObject({
        min: z.number().describe(
            "Inclusive lower bound (0 is treated as no bound).",
        ).optional(),
        max: z.number().describe(
            "Inclusive upper bound (0 is treated as no bound).",
        ).optional(),
    }).describe(description);

/** `company_filters` entries carry a `label`, like the company search's. */
const labelledEntries = (
    value: z.ZodType<string>,
    status: z.ZodType<string>,
    description: string,
) => z.array(
    z.strictObject({
        value,
        label: z.string().min(1).max(500).describe(
            "Display label for the value (required; repeat the value " +
                "when you have no label).",
        ),
        status,
    }),
).describe(description);

const usdRange = (description: string) =>
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

export const zPeopleFilters = z.strictObject({
    industry: includeExclude(
        "Industry of the person themselves; include/exclude entries whose" +
            " `value` is one of the 147 `industry` values from " +
            "`fuse#prospects/filter-options` (e.g. financial services). " +
            "Include values are OR-joined and every exclude applies; at most " +
            "1000 entries. A bare string or an array of strings are includes.",
    ).optional(),
    job_title_levels: includeExclude(
        "Seniority of the current job title; entries with `value` one of " +
            "exactly: cxo, vp, director, manager, senior, entry, owner, " +
            "partner, training, unpaid (the `job_title_levels` list in " +
            "`fuse#prospects/filter-options`). Include values are OR-joined " +
            "and every exclude applies; at most 1000 entries. A bare string " +
            "or an array of strings are includes.",
    ).optional(),
    job_title_role: includeExclude(
        "Department of the current job title; entries with `value` one of" +
            " the 24 `job_title_role` values in " +
            "`fuse#prospects/filter-options` (e.g. engineering, sales, " +
            "finance); `jobTitleRoleToSubRole` in the same response lists " +
            "each role's sub-roles. Include values are OR-joined and every " +
            "exclude applies; at most 1000 entries. A bare string or an array" +
            " of strings are includes.",
    ).optional(),
    job_company_size: includeExclude(
        "Headcount bracket of the current employer; entries with `value` " +
            "one of exactly: 1-10, 11-50, 51-200, 201-500, 501-1000, " +
            "1001-5000, 5001-10000, 10001+; brackets only, so use " +
            "`rangeInputs.job_company_employee_count` for an arbitrary " +
            "headcount range. Each bracket is searched as its own band: " +
            "include values are OR-joined and every exclude applies; at most " +
            "1000 entries. A bare string or an array of strings are includes.",
    ).optional(),
    job_company_inferred_revenue: includeExclude(
        "Inferred annual revenue bracket of the current employer; entries" +
            " with `value` one of exactly: $0-$1m, $1m-$10m, $10m-$25m, " +
            "$25m-$50m, $50m-$100m, $100m-$250m, $250m-$500m, $500m-$1b, " +
            "$1b-$10b, $10b+ (matched case-insensitively, so $1M-$10M also " +
            "works). Each bracket is searched as its own band: include values" +
            " are OR-joined and every exclude applies; at most 1000 entries. " +
            "A bare string or an array of strings are includes.",
    ).optional(),
    job_company_industry: includeExclude(
        "Industry of the current employer; entries with `value` one of " +
            "the same 147 industry values, listed under " +
            "`job_company_industry` in `fuse#prospects/filter-options`. " +
            "Include values are OR-joined and every exclude applies; at most " +
            "1000 entries. A bare string or an array of strings are includes.",
    ).optional(),
    job_company_location_country: includeExclude(
        "Country of the current employer's headquarters; entries with a " +
            "lower-case `value` from the 249 `job_company_location_country` " +
            "values in `fuse#prospects/filter-options` (e.g. united states, " +
            "germany); country NAMES, never ISO codes. Include values are " +
            "OR-joined and every exclude applies; at most 1000 entries. A " +
            "bare string or an array of strings are includes.",
    ).optional(),
    job_company_location_region: includeExclude(
        "Region or state of the current employer's headquarters; entries " +
            "with a free-text lower-case `value` such as california. A bare " +
            "string or an array of strings are includes.",
    ).optional(),
    "experience.title.levels": includeExclude(
        "Seniority held in a PAST job (the current job does not count), " +
            "matched on the past job's title words; entries with `value` one " +
            "of exactly: cxo, vp, director, manager, senior, entry, owner, " +
            "partner, training, unpaid. Next to `experience.title.role` both " +
            "must hold in the same past job. Include values are OR-joined and" +
            " every exclude applies; at most 1000 entries. A bare string or " +
            "an array of strings are includes.",
    ).optional(),
    "experience.title.role": includeExclude(
        "Department of a PAST job (the current job does not count), " +
            "matched on the past job's title words; entries with `value` one " +
            "of the 24 `experience.title.role` values in " +
            "`fuse#prospects/filter-options`; the same list as " +
            "`job_title_role`. Include values are OR-joined and every exclude" +
            " applies; at most 1000 entries. A bare string or an array of " +
            "strings are includes.",
    ).optional(),
    "languages.name": includeExclude(
        "Languages the person lists; entries with a lower-case `value` " +
            "from the 187 `languages.name` values in " +
            "`fuse#prospects/filter-options` (e.g. english, german); language" +
            " NAMES, never ISO codes. Common other names are read as the " +
            "listed language: farsi as persian, bangla as bengali, panjabi as" +
            " punjabi, slovene as slovenian, chinese and mandarin as " +
            "putonghua (Mandarin), tagalog and filipino as Tagalog/Filipino. " +
            "Include values are OR-joined and every exclude applies; at most " +
            "1000 entries. A bare string or an array of strings are includes.",
    ).optional(),
    location_country: includeExclude(
        "Country the person lives in; entries with a lower-case `value` " +
            "from the 249 `location_country` values in " +
            "`fuse#prospects/filter-options` (e.g. united states, united " +
            "kingdom); country NAMES, never ISO codes. Include values are " +
            "OR-joined and every exclude applies; at most 1000 entries. A " +
            "bare string or an array of strings are includes.",
    ).optional(),
    location_region: includeExclude(
        "Region or state the person lives in; entries with a free-text " +
            "lower-case `value` such as california. A region outside the " +
            "United States is matched through a table of each country's " +
            "regions; one the table does not hold is only searched next to a " +
            "single `location_country`, and otherwise answers 422 " +
            "FILTER_VALUE_UNRESOLVED. A bare string or an array of strings " +
            "are includes.",
    ).optional(),
    "education.degrees": includeExclude(
        "Degrees held; entries with `value` one of the 171 " +
            "`education.degrees` values in `fuse#prospects/filter-options` " +
            "(e.g. bachelors, masters, master of business administration). " +
            "Include values are OR-joined; include only, so an exclude entry " +
            "is dropped (the Business API refuses it with 422 " +
            "VALIDATION_FAILED); at most 1000 entries. A bare string or an " +
            "array of strings are includes.",
    ).optional(),
    job_company_name: includeExclude(
        "The current employer, matched by the company itself: send " +
            "entries `{ status, value, liOrgId?, domain? }` where `value` is " +
            "the company name and `liOrgId` (its LinkedIn organization id) or" +
            " `domain` identify it. An entry with only a name matches every " +
            "company with exactly that name. A bare string or an array of " +
            "strings are includes by name. A field none of whose companies " +
            "can be identified answers 422 FILTER_VALUE_UNRESOLVED; " +
            "unidentified ones next to identified ones are dropped.",
    ).optional(),
    job_company_website: includeExclude(
        "Website domain of the current employer (e.g. stripe.com; scheme," +
            " www and trailing slash are stripped); same value shapes as " +
            "`job_company_name`.",
    ).optional(),
    linkedin_url: includeExclude(
        "A LinkedIn profile, matched by its profile slug (older slugs of " +
            "the same person match too): a profile URL in any form (scheme, " +
            "www. or a country subdomain, a trailing slash or query string " +
            "and letter case are ignored), `in/<slug>` or the bare slug. A " +
            "string, an array of profiles that are OR-joined, or " +
            "include/exclude entries ({ status, value }); every exclude " +
            "applies, at most 1000 entries. Includes none of which names a " +
            "profile answer 422 FILTER_VALUE_UNRESOLVED.",
    ).optional(),
    "experience.company.name": includeOnlyCompany(
        "A PAST employer, matched by the company itself the same way as " +
            "`job_company_name` (`{ status: include, value, liOrgId?, domain?" +
            " }` entries, or names as a string or an array). Include only.",
    ).optional(),
    full_name: term(
        "Free text, matched FUZZILY against the person's name (e.g. Ada " +
            "Nwosu also finds close spellings), in any case. A string, or an " +
            "array of names that are OR-joined.",
    ).optional(),
    first_name: term(
        "Free text, matched fuzzily; sent next to `last_name` the two are" +
            " matched as one full name. A string, or an array of names that " +
            "are OR-joined.",
    ).optional(),
    last_name: term(
        "Free text, matched fuzzily; sent next to `first_name` the two " +
            "are matched as one full name. A string, or an array of names " +
            "that are OR-joined.",
    ).optional(),
    work_email: contactLookup(
        "An email address: the provider's best match for it is looked up," +
            " then searched with every other filter. A string, or an array of" +
            " up to 10 addresses that are OR-joined; when none of them finds " +
            "anyone the search gives no rows and bills nothing. Work and " +
            "personal addresses are looked up alike (`personal_emails` works " +
            "the same way); sent with `personal_emails` or `mobile_phone`, " +
            "the person must have all of them. A field none of whose values " +
            "is an email address answers 422 FILTER_VALUE_UNRESOLVED.",
    ).optional(),
    personal_emails: contactLookup(
        "An email address, looked up exactly as `work_email` is: the two " +
            "are interchangeable. A string, or an array of up to 10 addresses" +
            " that are OR-joined; sent with `work_email` or `mobile_phone`, " +
            "the person must have all of them.",
    ).optional(),
    mobile_phone: contactLookup(
        "A phone number in E.164 with the leading + (e.g. +14155552671); " +
            "one without a country code is read as a US number. The " +
            "provider's best match for it is looked up, then searched with " +
            "every other filter; a company's number finds nobody. A string, " +
            "or an array of up to 10 numbers that are OR-joined; when none of" +
            " them finds anyone the search gives no rows and bills nothing. " +
            "Sent with `work_email` or `personal_emails`, the person must " +
            "have all of them. A field none of whose values is a phone number" +
            " answers 422 FILTER_VALUE_UNRESOLVED.",
    ).optional(),
    job_title: term(
        "Current job title (e.g. chief financial officer), matched " +
            "exactly in any case together with its common forms (cfo, vp of " +
            "sales / vice president of sales / vp sales); a string or an " +
            "array of titles; use `keywords` for partial matches.",
    ).optional(),
    job_company_location_name: term(
        "City of the current employer's headquarters as a location name " +
            "(e.g. san francisco, california, united states), searched as the" +
            " area the city covers.",
    ).optional(),
    location_name: term(
        "City the person lives in, as a location name (e.g. london, " +
            "greater london, united kingdom), searched as the area the city " +
            "covers, so some suburbs count.",
    ).optional(),
    "education.school.name": term(
        "Lower-case name of a school attended (e.g. stanford university).",
    ).optional(),
    "experience.title.name": term(
        "Exact lower-case title held at any past job; a string or an " +
            "array of titles.",
    ).optional(),
    "experience.company.website": term(
        "Free text: the website host of any past employer (e.g. " +
            "stripe.com). The scheme, www. and a trailing slash are stripped " +
            "and both the host+path and host-only forms are tried, so a full " +
            "URL still matches; a host the provider does not store matches " +
            "nothing. A string, or an array of hosts that are OR-joined.",
    ).optional(),
    job_start_date: term(
        "Months in current role: finds people who started their current " +
            "role within the last N months. Send N as a number (6 finds " +
            "people who started in the last 6 months), or the earliest start " +
            "month as YYYY-MM or YYYY-MM-DD (started on or after the first " +
            "day of that month); with several values the earliest start " +
            "applies, and 0 is no filter.",
    ).optional(),
    skills: term(
        "Lower-case skill (e.g. python); a string, or an array of skills " +
            "any of which may match.",
    ).optional(),
    "certifications.name": term(
        "Lower-case certification name (e.g. pmp); a string or an array.",
    ).optional(),
    keywords: titleWords(
        "Free text: up to 50 terms (200 chars each), each matched against" +
            " the current job title only and OR-joined, so any one may match." +
            " Terms match WHOLE words in any case (growth matches Head of " +
            "Growth, not Growthwise); plural and related forms are added " +
            "(engineer also finds engineers and engineering), and * or ? are " +
            "ignored. A term with no text other than wildcards is ignored, " +
            "and a list holding only such terms does not count as search " +
            "criteria.",
    ).optional(),
    excludedKeywords: titleWords(
        "Free text: up to 50 terms (200 chars each) using exactly the " +
            "same matching rules as `keywords`, but REMOVING every prospect " +
            "whose current job title matches any one of them; keywords " +
            "[engineer] with excludedKeywords [infrastructure] keeps Engineer" +
            " VP and drops Engineer VP Infrastructure. It reads the whole job" +
            " title, so it also removes rows matched by `job_title`. A term " +
            "with no text other than wildcards is ignored, since it would " +
            "remove every prospect that has a job title. Exclusions only " +
            "narrow a result set: on their own they are not search criteria " +
            "and a request carrying nothing else is rejected.",
    ).optional(),
    rangeInputs: z.strictObject({
        job_company_employee_count: range(
            "Headcount of the current employer; accepted values are whole " +
                "numbers and both bounds are inclusive. A min of 0 is ignored " +
                "rather than applied, so cap headcount with max alone.",
        ).optional(),
        inferred_years_experience: range(
            "Total years of professional experience; accepted values are " +
                "whole numbers of years and both bounds are inclusive. A min of 0" +
                " is ignored rather than applied.",
        ).optional(),
        job_company_total_funding_raised: range(
            "Total funding raised by the current employer; accepted values " +
                "are whole US dollars, not millions (10000000 means $10M), and " +
                "both bounds are inclusive. A min of 0 is ignored rather than " +
                "applied.",
        ).optional(),
    }).describe(
        "Numeric range filters, each key one of exactly: " +
            "`job_company_employee_count`, `inferred_years_experience`, " +
            "`job_company_total_funding_raised` (any other key is rejected). " +
            "Each value is `{ min?, max? }` with at least one bound and min " +
            "<= max; several ranges AND with each other and with every other " +
            "filter.",
    ).optional(),
    company_filters: z.strictObject({
        status: labelledEntries(
            z.enum(["active", "acquired", "closed"]),
            z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
            "Entries whose `value` is one of exactly: active, acquired, " +
                "closed. Include values are OR-joined and every exclude value is " +
                "removed; this filter ANDs with the others.",
        ).optional(),
        tags: labelledEntries(
            z.enum([
                "venture-backed-startup",
                "is-school",
                "is-government",
                "raised-from-top-vc",
            ]),
            z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
            "Entries whose `value` is one of exactly: venture-backed-startup," +
                " is-school, is-government, raised-from-top-vc. Include values " +
                "are OR-joined and every exclude value is removed; this filter " +
                "ANDs with the others.",
        ).optional(),
        acceleratorsV2: labelledEntries(
            z.string().min(1).max(500).describe(
                "The filter value; see the field's own description for its " +
                    "vocabulary.",
            ),
            z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
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
        stage: labelledEntries(
            z.enum([
                "no_funding_yet",
                "pre_seed",
                "seed",
                "series_a",
                "series_b",
                "series_c",
                "series_d",
                "series_e",
                "series_f",
                "series_g",
                "series_h",
                "series_i",
                "series_j",
                "private_equity",
                "venture_other",
                "public",
                "acquired",
                "closed",
                "unknown",
            ]),
            z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
            "Entries whose `value` is one of exactly: no_funding_yet, " +
                "pre_seed, seed, series_a, series_b, series_c, series_d, " +
                "series_e, series_f, series_g, series_h, series_i, series_j, " +
                "private_equity, venture_other, public, acquired, closed, " +
                "unknown. Include values are OR-joined and every exclude value is" +
                " removed; this filter ANDs with the others.",
        ).optional(),
        investors: labelledEntries(
            z.string().min(1).max(500).describe(
                "The filter value; see the field's own description for its " +
                    "vocabulary.",
            ),
            z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
            "Investor entries whose `value` is the investor's website domain," +
                " never the investor's name: `fuse#data/companies/resolve` finds " +
                "a firm's domain from its name. An off-list value is not rejected" +
                " by this API: the search comes back empty (or fails upstream) " +
                "with no error naming the field, so check the value against the " +
                "list first. Include values are OR-joined (provider `anyOf`) and " +
                "every exclude value is removed (`noneOf`); this filter ANDs with" +
                " the others.",
        ).optional(),
        technologies: labelledEntries(
            z.string().min(1).max(500).describe(
                "The filter value; see the field's own description for its " +
                    "vocabulary.",
            ),
            z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
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
        industriesV2: labelledEntries(
            z.string().min(1).max(500).describe(
                "The filter value; see the field's own description for its " +
                    "vocabulary.",
            ),
            z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
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
            z.string().min(1).max(500).describe(
                "The filter value; see the field's own description for its " +
                    "vocabulary.",
            ),
            z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
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
            z.string().min(1).max(500).describe(
                "The filter value; see the field's own description for its " +
                    "vocabulary.",
            ),
            z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
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
        naicsCodes: labelledEntries(
            z.string().min(1).max(500).describe(
                "The filter value; see the field's own description for its " +
                    "vocabulary.",
            ),
            z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
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
        officeLocationsV2: labelledEntries(
            z.string().min(1).max(500).describe(
                "The filter value; see the field's own description for its " +
                    "vocabulary.",
            ),
            z.enum(["include", "exclude"]).describe(
                "`include` matches the value; `exclude` removes companies " +
                    "carrying it (includes OR together, every exclude applies).",
            ),
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
        fortuneRankings: labelledEntries(
            z.enum(["fortune-500", "forbes-global-2000"]),
            z.enum(["include"]),
            "People whose current employer is on a list: entries whose " +
                "`value` is one of exactly: fortune-500 (the Fortune 500), " +
                "forbes-global-2000 (the Forbes Global 2000). Include only; " +
                "several lists are OR-joined.",
        ).optional(),
        keywords: z.array(z.string()).describe(
            "Free-text keywords matched against company names and " +
                "descriptions; any may match.",
        ).optional(),
        crunchbaseCategoryGroups: z.array(z.string()).describe(
            "Crunchbase category groups as plain strings copied verbatim " +
                "(case-sensitive) from `crunchbaseCategoryGroups` in " +
                "`fuse#companies/filter-options` (e.g. Financial Services); the " +
                "broad parent of `crunchbaseCategories`. An off-list value is not" +
                " rejected by this API: the search comes back empty (or fails " +
                "upstream) with no error naming the field, so check the value " +
                "against the list first. Several groups are OR-joined (provider " +
                "`anyOf`); this filter has no exclude form.",
        ).optional(),
        linkedinSlugs: z.array(z.string()).describe(
            "Free text: LinkedIn company slugs (e.g. stripe). A full company " +
                "URL is accepted and reduced to the part after " +
                "linkedin.com/company/, and the value is lower-cased, because the" +
                " provider matches the slug exactly. Several slugs are OR-joined.",
        ).optional(),
        lastFundingUSD: usdRange(
            "Size range of the most recent funding round `{ min?, max? }`; " +
                "the accepted values are whole US dollars, not millions (5000000 " +
                "means $5M), and both bounds are inclusive.",
        ).optional(),
        foundedOn: dateRange(
            "Founding-date range `{ start?, end? }` as ISO-8601 dates.",
        ).optional(),
        lastFundedOn: dateRange(
            "Date range of the most recent funding round, `{ start?, end? }` " +
                "as ISO-8601 dates.",
        ).optional(),
    }).describe(
        "Filters on the person's CURRENT employer, in the company search " +
            "vocabulary and value shapes (the same as `fuse#companies/search`" +
            " `filters`, limited to these keys): include/exclude fields take " +
            "`[{ status, value, label }]` entries, list fields arrays of " +
            "strings, `lastFundingUSD` `{ min, max }` and the date ranges `{ " +
            "start, end }`. Every filter here ANDs with the rest of the " +
            "search, and any of them makes it a search of people at matching " +
            "companies. Only people whose current employer the provider has " +
            "identified can match.",
    ).optional(),
});
