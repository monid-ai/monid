import { z } from "zod";

/** `GET /prospects/filter-options` query — the mirror of Fuse's published
 *  `field` parameter (design D25), STRICT like the API: a misspelled key is
 *  refused rather than answered with every filter. */
export const zPeopleFilterOptionsQuery = z.strictObject({
    field: z.enum([
        "industry",
        "job_title_levels",
        "job_title_role",
        "job_company_size",
        "job_company_inferred_revenue",
        "job_company_industry",
        "job_company_location_country",
        "job_company_location_region",
        "experience.title.levels",
        "experience.title.role",
        "languages.name",
        "location_country",
        "location_region",
        "education.degrees",
        "job_company_name",
        "job_company_website",
        "linkedin_url",
        "experience.company.name",
        "full_name",
        "first_name",
        "last_name",
        "work_email",
        "personal_emails",
        "mobile_phone",
        "job_title",
        "job_company_location_name",
        "location_name",
        "education.school.name",
        "experience.title.name",
        "experience.company.website",
        "job_start_date",
        "skills",
        "certifications.name",
    ]).describe(
        "One filter to answer for, by its search field name (e.g. " +
            "`job_title_levels`); omitted, every filter is answered.",
    ).optional(),
});
