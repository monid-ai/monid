import { z } from "zod";

export const LIMIT_MAX = 100;

export const zDate = z.iso.date().describe("YYYY-MM-DD.");

export const zCountries = z.array(z.string().regex(/^([A-Z]{2}|unknown)$/))
    .min(1).describe(
        "ISO-3166 alpha-2 HQ country codes (OR); `unknown` matches companies " +
            "with no country on file.",
    );

export const zIndustryGroups = z.array(z.string().min(1)).min(1).describe(
    "LinkedIn industry labels (OR), matched case-insensitively, e.g. " +
        "'Software Development'.",
);

export const zVerticals = z.array(z.string().min(1)).min(1).describe(
    "Sector buckets (OR): ai, fintech, saas, devtools, healthcare, climate, " +
        "robotics, cybersecurity, logistics, commerce and more.",
);

export const zNaics = z.string().regex(/^\d{2,6}(-\d{2})?$/).describe(
    "NAICS 2022 code; matches the code and everything beneath it.",
);

export const zDomain = z.string().min(3).describe(
    "Company domain; matches its primary domain or any domain it redirected " +
        "from. A full URL is reduced to its domain.",
);

export const zUsd = z.number().nonnegative().describe("Whole USD.");

export const zListPaging = {
    limit: z.number().int().min(1).max(LIMIT_MAX).describe(
        "Rows to return, 1 to 100. Billing is 1 credit per row returned.",
    ),
    cursor: z.string().min(1).optional().describe(
        "pagination.nextCursor from the previous page.",
    ),
    includeTotal: z.boolean().optional().describe(
        "Also return pagination.total. Costs no credits.",
    ),
    since: zDate.optional().describe("On or after this date (YYYY-MM-DD)."),
    until: zDate.optional().describe(
        "On or before this date (YYYY-MM-DD, inclusive).",
    ),
};

export const zCompanySelector = {
    id: z.string().min(1).optional().describe("Datahyena company id."),
    domain: zDomain.optional(),
    name: z.string().min(1).optional().describe("Company name."),
    linkedinUrl: z.string().min(1).optional().describe(
        "Company LinkedIn URL or handle.",
    ),
};

export const ONE_SELECTOR =
    "Give one of id, domain, name or linkedinUrl to pick the company.";
