import { z } from "zod";

export const zCompanyJobsPathParams = z.strictObject({
    company_slug: z.string().min(1).describe(
        'The company\'s Hirebase slug, e.g. "stripe". A slug is not the ' +
            "website or the name: resolve it with hirebase#companies/search.",
    ),
});

/** GET /v2/hirebase/companies/{company_slug}/jobs query. `sort_by` and
 *  `sort_order` are documented as not applied, so they are not mirrored. */
export const zCompanyJobsQueryParams = z.strictObject({
    job_category: z.string().min(1).describe(
        'Only jobs in this category, e.g. "Engineering Jobs". The ' +
            "response lists the company's categories in job_categories.",
    ).optional(),
    job_board: z.string().min(1).describe(
        'Only jobs from this source, e.g. "Greenhouse".',
    ).optional(),
    page: z.number().int().min(1).describe("Page number (default 1).")
        .optional(),
    limit: z.number().int().min(1).describe(
        "Jobs per page, 1-100. Each job returned is billed.",
    ).optional(),
});
