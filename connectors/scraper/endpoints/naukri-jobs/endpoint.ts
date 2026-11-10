import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNaukriJobsBody } from "./schema/inputs.ts";

/**
 * `POST /naukri/jobs`: 1 credit per call, plus 1 more when `fetchDetails`
 * is true (the vendor's own `meta.creditsUsed`: 1 for search, 2 with
 * details). The surcharge is flat per call, not per job, so it does not
 * scale with `maxItems`. Flat fee AND a gated metered line ⇒ COMPOSITE.
 */
export default defineEndpoint({
    meta: {
        displayName: "Naukri Jobs",
        summary: "Search public Naukri job listings in India with typed " +
            "filters, optionally with full job details.",
        description: "Search public Naukri job listings in India by keyword " +
            "and location and get structured jobs back: title, company, " +
            "location, work arrangement (office, remote, hybrid), " +
            "experience range, salary, and the Naukri link. Narrow it " +
            "with `filters` (sort, posting age, experience, work mode, " +
            "salary band, company or consultant posts, radius), " +
            "`internshipFilters` (internships, stipend, duration, campus " +
            "jobs), and `advancedFilters` (company, city, locality, " +
            "department, industry, role, and course IDs, company name). " +
            "The call needs at least one search selector or it fails with " +
            "400. Set `fetchDetails` to true to add the full record " +
            "(description, skills, company profile) to each result; that " +
            "costs 1 extra credit and needs `maxItems` of 10 or less. " +
            "Covers India only. To fetch one known job by ID or URL use " +
            "`scraper#naukri/job-detail`; for jobs in other countries use " +
            "`scraper#indeed/jobs`, `scraper#linkedin/jobs`, or " +
            "`scraper#glassdoor/jobs`.",
        docsUrl: "https://scraper.run/docs/naukri/jobs",
        categories: ["jobs"],
        notes: [
            "1 Scraper credit per call, 2 when `fetchDetails` is true, " +
            "whatever `maxItems` is.",
            "The call needs at least one search selector (a keyword, a " +
            "location, or a filter that narrows the search), or it fails " +
            "with 400 and no credits. Sorting, radii, `maxItems`, and " +
            "`fetchDetails` are not selectors.",
            "`filters.locationRadiusKm` needs `location` or " +
            "`advancedFilters.cityIds`, and " +
            "`advancedFilters.localityRadiusKm` needs " +
            "`advancedFilters.localityIds`, or the call fails with 400.",
            "`fetchDetails: true` needs `maxItems` of 10 or less. Set " +
            "`maxItems` explicitly, because the default of 20 is " +
            "rejected.",
        ],
    },
    request: { method: "POST", path: "/naukri/jobs" },
    input: { schema: { body: zNaukriJobsBody } },
    usage: {
        /** Flat search fee AND a gated detail surcharge (AND = COMPOSITE).
         *  The surcharge is a metered line counted 1 or 0, so the line's
         *  unit is the vendor's own credit. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_CALL,
                    label: "search",
                    consumes: { credit: "default", amount: 1 },
                },
                detail_enrichment: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.CREDIT,
                    label: "detail enrichment",
                    description: "1 extra credit per call when " +
                        "`fetchDetails` is true",
                    consumes: { credit: "default", amount: 1 },
                },
            },
        },
        estimate: ({ data }) => ({
            counts: {
                detail_enrichment: data.input.body.fetchDetails === true
                    ? 1
                    : 0,
            },
        }),
        evidence: ({ data }) => ({
            counts: {
                detail_enrichment: data.input.body.fetchDetails === true
                    ? 1
                    : 0,
            },
        }),
    },
});
