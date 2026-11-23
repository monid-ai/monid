import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { LIMIT_MAX } from "../../schema/common.ts";
import { zJobsSearchBody } from "./schema/inputs.ts";

/** POST /v2/jobs/search — filtered job search, billed per job returned. */
export default defineEndpoint({
    meta: {
        displayName: "Search Jobs",
        summary: "Search live job postings by title, location, salary, " +
            "company, date and 30+ other filters.",
        description: "Search live job postings read directly from company " +
            "careers pages. Filter by job title (with exact-phrase and " +
            "exclusion syntax), keywords, city/region/country with a " +
            "radius, remote/hybrid/in-person, experience level and years, " +
            "employment type, salary range, industry, company (name, " +
            "website domain or slug), company size, funding stage and " +
            "amount, source ATS, visa sponsorship, and posting or " +
            "first-seen date. Returns per job: parsed and raw title, " +
            "cleaned description, apply link, locations with " +
            "coordinates, location type, salary range, experience level " +
            "and years, skills, technologies, job categories, posting " +
            "date, first-seen time, source ATS, and a company_data block " +
            "(industry, size, description, website). To learn only how " +
            "many jobs match, call hirebase#jobs/estimate first: it " +
            "takes the same filters and is free. This is the endpoint when the request can be " +
            "written as filters; when it is a description of the kind of " +
            'job wanted, a resume match, or "more like this job", use ' +
            "hirebase#jobs/neural-search instead. For aggregate numbers " +
            "over a search (median salary, top employers, top skills) " +
            "use hirebase#jobs/insights, which costs one unit instead of " +
            "one per job. Suited for job boards and job-matching agents, " +
            "finding companies hiring for a role as a sales or " +
            "recruiting trigger, and monitoring new postings with " +
            "ingested_after.",
        docsUrl: "https://www.hirebase.org/docs/api-reference/jobs/search-post",
        categories: ["jobs"],
        notes: [
            "`experience` filters by years-of-experience band, not by the " +
            'seniority word in the title: "Executive" means 10+ years ' +
            "and returns mostly senior and staff roles.",
            "Geo matching defaults to the surrounding metro area. Set " +
            'geofilter_params.mode to "strict" for the exact location.',
            "To poll for new jobs, pass the time of the previous run as " +
            "ingested_after (minus a 2-hour overlap) with sort_by " +
            '"first_ingested" and sort_order "asc", and de-duplicate ' +
            "on _id.",
            "funding_types, total_funding and funded_after only match " +
            "companies with funding on file; a job at a company with " +
            "none never matches.",
        ],
    },
    request: { method: "POST", path: "/jobs/search" },
    // `limit` REQUIRED and CAPPED at the binding (design D25): it is the
    // billing knob — one unit per job returned — so the caller states it.
    input: {
        schema: {
            body: zJobsSearchBody.extend({
                limit: zJobsSearchBody.shape.limit.unwrap().max(LIMIT_MAX),
            }),
        },
    },
    usage: {
        /** 1 unit of the jobs allowance per job returned (published rate
         *  card). Settle is inherited: the provider evidence counts
         *  `$.jobs`. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "jobs",
            consumes: { credit: "jobs", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.limit },
        }),
    },
});
