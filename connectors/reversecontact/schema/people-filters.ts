import { z } from "zod";
import { zLocation, zRange, zValues } from "./common.ts";

/**
 * The People filters, shared by `search/people` and `search/people/count`
 * (the gateway's `PeopleFilterFields`, public v2, 2026-10-21). Filters are
 * AND-combined and only narrow the result set.
 *
 * Multi-value fields are LISTS here. The gateway also takes a bare string,
 * but one shape per field is what a caller should see. The function and
 * seniority taxonomies are closed upstream (an off-taxonomy value answers
 * 422 `INVALID_FILTER_VALUE`), so they are enums; sub-functions and
 * industries are long sealed lists, validated upstream, described here.
 *
 * Cross-field rules the gateway enforces (documented in the endpoint
 * notes): at least one filter, `excludeLanguages` needs a positive filter,
 * `followersCount` alone needs both bounds, and an include list may not
 * contradict its exclude twin.
 */

const zFunction = z.enum([
    "Administrative",
    "Agriculture and Environment",
    "Construction and Trades",
    "Consulting and Advisory",
    "Customer Service",
    "Design",
    "Education",
    "Energy and Utilities",
    "Entertainment and Gaming",
    "Executive and Leadership",
    "Finance",
    "Hospitality and Tourism",
    "Human Resources",
    "Legal",
    "Marketing",
    "Media and Communications",
    "Medical and Health",
    "Nonprofit and Government",
    "Not Employed",
    "Operations",
    "Other",
    "Personal and Home Services",
    "Product",
    "Project and Program Management",
    "Public Safety and Security",
    "Real Estate",
    "Research and Science",
    "Retail and Consumer",
    "Sales",
    "Software",
    "Traditional Engineering",
    "Transportation and Logistics",
]);

const zSeniority = z.enum([
    "CXO",
    "VP",
    "Director",
    "Head",
    "Manager",
    "Partner",
    "Owner / Founder",
    "Individual Contributor",
    "Intern",
    "Other",
]);

const INDUSTRY_HINT = "Exact values of the industry taxonomy " +
    "(https://docs.reversecontact.com/guides/industries), e.g. 'Software " +
    "Development', 'IT Services and IT Consulting', 'Financial Services'. " +
    "No fuzzy matching: 'Technology' or 'SaaS' alone are not values.";

const SUB_FUNCTION_HINT = "Sub-functions of the Reverse Contact position " +
    "taxonomy, e.g. 'Account Executive', 'Backend and API Engineering', " +
    "'Brand Marketing'. An unknown value answers 422 INVALID_FILTER_VALUE.";

export const peopleFilterFields = {
    firstName: z.string().min(1).describe("First name.").optional(),
    lastName: z.string().min(1).describe("Last name.").optional(),
    headline: z.string().min(1).describe(
        "Words to find in the profile headline.",
    ).optional(),
    keywords: z.string().min(1).describe(
        "Words searched across the whole profile (headline, summary, " +
            "titles, companies, skills, education, location). Every word " +
            "must appear, in any field; whole words only.",
    ).optional(),
    email: z.email().describe(
        "A known email address of the person.",
    ).optional(),
    isOpenToWork: z.boolean().describe(
        "Only people signalling they are open to work.",
    ).optional(),
    isCurrentlyEmployed: z.boolean().describe(
        "Only people with (true) or without (false) a current position.",
    ).optional(),
    isPremium: z.boolean().describe(
        "Only people with a premium account.",
    ).optional(),
    isVerified: z.boolean().describe(
        "Only people with a verified identity badge.",
    ).optional(),
    followersCount: zRange(1_000_000_000, "followers").describe(
        "Follower count range. Used alone, it needs both bounds.",
    ).optional(),

    currentPositionTitle: zValues("Current job titles.").optional(),
    excludeCurrentPositionTitle: zValues(
        "Current job titles to exclude.",
    ).optional(),
    positionTitle: zValues(
        "Job titles held at any point (current or past).",
    ).optional(),
    excludePositionTitle: zValues(
        "Job titles, current or past, to exclude.",
    ).optional(),
    currentFunction: z.array(zFunction).min(1).max(20).describe(
        "Functions of the current position.",
    ).optional(),
    excludeCurrentFunction: z.array(zFunction).min(1).max(20).describe(
        "Functions of the current position to exclude.",
    ).optional(),
    currentSubFunction: zValues(SUB_FUNCTION_HINT).optional(),
    excludeCurrentSubFunction: zValues(
        `${SUB_FUNCTION_HINT} Excluded.`,
    ).optional(),
    currentSeniority: z.array(zSeniority).min(1).max(20).describe(
        "Seniority of the current position.",
    ).optional(),
    excludeCurrentSeniority: z.array(zSeniority).min(1).max(20).describe(
        "Seniority levels of the current position to exclude.",
    ).optional(),
    changedJobsWithinDays: z.literal([30, 60, 90, 120]).describe(
        "Current position started within the last N days: 30, 60, 90 or " +
            "120.",
    ).optional(),
    totalExperienceMonths: zRange(1_200, "months").describe(
        "Total professional experience, in months.",
    ).optional(),
    experience: z.array(
        z.object({
            dimension: z.enum(["function", "subFunction", "seniority"])
                .describe("Which taxonomy `value` belongs to."),
            value: z.string().min(1).describe(
                "A function, sub-function or seniority value.",
            ),
            minMonths: z.number().int().min(0).max(720).describe(
                "Minimum cumulative months in it, 0 to 720.",
            ).optional(),
        }).strict(),
    ).min(1).max(10).describe(
        "Cumulative experience requirements across the whole career, e.g. " +
            "at least 24 months in the 'Sales' function. Up to 10 entries, " +
            "all required.",
    ).optional(),

    currentCompanyName: z.string().min(1).describe(
        "Current employer name.",
    ).optional(),
    excludeCurrentCompanyName: z.string().min(1).describe(
        "Current employer name to exclude.",
    ).optional(),
    currentCompanyId: zValues(
        "Reverse Contact ids (`com_...`) of the current employer, as " +
            "returned by an organization search or a company enrichment.",
    ).optional(),
    excludeCurrentCompanyId: zValues(
        "Reverse Contact company ids (`com_...`) to exclude as current " +
            "employer.",
    ).optional(),
    currentCompanyLinkedinId: zValues(
        "Numeric LinkedIn ids of the current employer.",
    ).optional(),
    excludeCurrentCompanyLinkedinId: zValues(
        "Numeric LinkedIn ids to exclude as current employer.",
    ).optional(),
    currentCompanyPublicId: zValues(
        "Public page handles of the current employer, e.g. 'stripe'.",
    ).optional(),
    excludeCurrentCompanyPublicId: zValues(
        "Public page handles to exclude as current employer.",
    ).optional(),
    currentCompanyIndustry: zValues(
        `Industry of the current employer. ${INDUSTRY_HINT}`,
    ).optional(),
    currentCompanyEmployeeCountRange: zRange(1_000_000_000, "employees")
        .describe("Headcount range of the current employer.").optional(),

    companyName: zValues(
        "Employer names, current or past.",
    ).optional(),
    excludeCompanyName: zValues(
        "Employer names, current or past, to exclude.",
    ).optional(),
    companyId: zValues(
        "Reverse Contact company ids (`com_...`), current or past employer.",
    ).optional(),
    excludeCompanyId: zValues(
        "Reverse Contact company ids (`com_...`) to exclude, current or " +
            "past employer.",
    ).optional(),
    companyLinkedinId: zValues(
        "Numeric LinkedIn company ids, current or past employer.",
    ).optional(),
    excludeCompanyLinkedinId: zValues(
        "Numeric LinkedIn company ids to exclude, current or past employer.",
    ).optional(),
    companyPublicId: zValues(
        "Public page handles, current or past employer.",
    ).optional(),
    excludeCompanyPublicId: zValues(
        "Public page handles to exclude, current or past employer.",
    ).optional(),
    companyIndustry: zValues(
        `Industry of any employer, current or past. ${INDUSTRY_HINT}`,
    ).optional(),
    excludeCompanyIndustry: zValues(
        `Industries to exclude, any employer. ${INDUSTRY_HINT}`,
    ).optional(),

    skills: zValues(
        "Skill names. Whole-value match: 'Java' does not match 'JavaScript'.",
    ).optional(),
    languages: zValues(
        "Spoken languages, English names, e.g. 'French'.",
    ).optional(),
    excludeLanguages: zValues(
        "Spoken languages to exclude. Needs another, positive filter.",
    ).optional(),
    location: zLocation("Where the person is based.").optional(),
    maxDataAgeDate: z.iso.datetime().describe(
        "Only profiles refreshed at or after this ISO 8601 date-time.",
    ).optional(),
};
