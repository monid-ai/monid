import { z } from "zod";
import { zCompany } from "../../../schema/company.ts";
import { zSearchCursor, zSearchFilters } from "../../../schema/search.ts";

/**
 * `POST /companies/people` body — the mirror of outbound.dev's published
 * request (design D25), STRICT like the API. `company` takes what the
 * company resolver takes. `limit`'s vendor default (10) is applied at the
 * binding.
 */
export const zCompanyPeopleBody = z.strictObject({
    company: zCompany.describe(
        "The company, by `domain`, `linkedinUrl` or `name`, as " +
            "`outbound-dev#companies/resolve` takes them; only the most " +
            "precise one sent is looked up, and a domain is safest for a " +
            "common name.",
    ),
    filters: zSearchFilters.describe(
        "People filters to narrow the company's people, e.g. " +
            '`{"job_title_levels": ["cxo", "vp"]}` for seniority or ' +
            '`{"job_title_role": ["sales"]}` for department. ' +
            "`outbound-dev#people/filters` lists every filter and the " +
            "values it accepts.",
    ).optional(),
    limit: z.number().int().min(1).max(25).describe(
        "People per page (1-25, default 10). Charged per person returned.",
    ).optional(),
    cursor: zSearchCursor.describe(
        "The `pagination.nextCursor` of the page before, sent with the " +
            "same `company` and `filters`, for the next page.",
    ).optional(),
});
