import { z } from "zod";
import { zPeopleFilters } from "../../../schema/people-filters.ts";
import { zCompany } from "../../../schema/company.ts";

/**
 * `POST /data/companies/people` body — the mirror of Fuse's published
 * request (design D25), STRICT like the API. `company` takes what the
 * company resolver takes; `filters` is the people search vocabulary without
 * its four company fields, which Fuse refuses here because `company` already
 * names the company. `size`'s vendor default (10) is applied at the binding.
 */
export const zCompanyPeopleBody = z.strictObject({
    company: zCompany.describe(
        "The company, by `name`, `domain` or `linkedinUrl`, as " +
            "`fuse#data/companies/resolve` takes them; only the most precise " +
            "one sent is looked up.",
    ),
    filters: zPeopleFilters.omit({
        job_company_name: true,
        job_company_website: true,
        "experience.company.name": true,
        "experience.company.website": true,
    }).describe(
        "People filters on the person, e.g. `job_title_levels` and " +
            "`job_title_role`, in the vocabulary " +
            "`fuse#prospects/filter-options` lists; when sent, at least one " +
            "must hold a value. The company filters `job_company_name`, " +
            "`job_company_website`, `experience.company.name` and " +
            "`experience.company.website` are not taken: the company is the " +
            "one `company` names.",
    ).optional(),
    size: z.number().int().min(1).max(25).describe(
        "People per page, 1 to 25 (default 10). Each person returned is " +
            "charged.",
    ).optional(),
    scrollToken: z.string().describe(
        "The `scrollToken` the previous page answered, sent with the same " +
            "`company` and `filters`, for the next page. A token Fuse did not " +
            "issue answers 422 SCROLL_TOKEN_INVALID: start again without it.",
    ).optional(),
});
