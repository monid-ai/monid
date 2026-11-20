import { z } from "zod";

// The request shapes mirror the Saleshandy Open API reference.

const zIncludesExactMatch = z.strictObject({
    includes: z.array(z.string()).optional(),
    exactMatch: z.literal([0, 1]).optional(),
});

const zIncludesExcludesExactMatch = z.strictObject({
    includes: z.array(z.string()).optional(),
    excludes: z.array(z.string()).optional(),
    exactMatch: z.literal([0, 1]).optional(),
});

const zIncludesExcludes = z.strictObject({
    includes: z.array(z.string()).optional(),
    excludes: z.array(z.string()).optional(),
});

const zIncludes = z.strictObject({
    includes: z.array(z.string()).optional(),
});

const zExperienceFilter = z.strictObject({
    includes: z.array(z.string()).optional(),
    excludes: z.array(z.string()).optional(),
    exactMatch: z.literal([0, 1]).optional(),
    shouldSearchPast: z.number().optional(),
    shouldSearchActiveExperiences: z.literal([0, 1]).optional(),
});

const zRange = z.strictObject({
    min: z.string().optional(),
    max: z.string().optional(),
});

const zCompanyDomainExperienceFilter = z.strictObject({
    includes: z.array(z.string()).optional(),
    excludes: z.array(z.string()).optional(),
    shouldSearchActiveExperiences: z.literal([0, 1]).optional(),
});

export const zSearchPeople = z.strictObject({
    full_name: zIncludesExactMatch.optional(),
    decision_maker: z.boolean().optional(),
    company_bootstraped: z.boolean().optional(),
    is_b2b: z.boolean().optional(),
    linkedin_url: z.array(z.string()).optional(),
    location: zIncludesExcludesExactMatch.optional(),
    department: zIncludesExcludes.optional(),
    company_hq_location: zIncludesExcludesExactMatch.optional(),
    certifications: zIncludes.optional(),
    job_title: zExperienceFilter.optional(),
    management_level: zIncludesExcludes.optional(),
    jobs_changed_within: zRange.optional(),
    company_annual_revenue: zRange.optional(),
    company_funding_amount: zRange.optional(),
    company_funding_date: zRange.optional(),
    company_founded_year: zRange.optional(),
    skills: zIncludesExcludesExactMatch.optional(),
    current_company_experience: zRange.optional(),
    current_role_tenure: zRange.optional(),
    total_experience: zRange.optional(),
    company_industry: zIncludesExcludes.optional(),
    company_name: zExperienceFilter.optional(),
    projected_base_salary: zRange.optional(),
    company_size: zRange.optional(),
    linkedin_connection_count: zRange.optional(),
    linkedin_followers_count: zRange.optional(),
    education_degrees: zIncludesExcludes.optional(),
    social_link: zIncludes.optional(),
    keywords: zIncludes.optional(),
    page: z.number().min(1).max(400).optional(),
    tab: z.enum(["total", "netNew"]).optional(),
    limitPerCompany: z.number().min(1).max(10000).optional(),
    company_domain: zCompanyDomainExperienceFilter.optional(),
});

const zReviewScoreChange = z.strictObject({
    duration: z.enum(["current", "monthly", "quarterly", "yearly"]).optional(),
    direction: z.enum(["up", "down", "any"]).optional(),
    points_range: zRange.optional(),
});

const zSeniorityCountFilter = z.strictObject({
    group: z.enum([
        "owner",
        "founder",
        "clevel",
        "partner",
        "vp",
        "head",
        "director",
        "manager",
        "senior",
        "mid",
        "junior",
        "intern",
        "specialist",
        "other_management",
    ]).optional(),
    count: zRange.optional(),
});

const zDepartmentCountFilter = z.strictObject({
    group: z.enum([
        "medical",
        "sales",
        "hr",
        "legal",
        "marketing",
        "finance",
        "technical",
        "consulting",
        "operations",
        "product",
        "general_management",
        "administrative",
        "customer_service",
        "project_management",
        "design",
        "research",
        "trades",
        "real_estate",
        "education",
        "other_department",
    ]).optional(),
    count: zRange.optional(),
});

const zBaseSalaryFilter = z.strictObject({
    title: zIncludesExcludesExactMatch.optional(),
    range: zRange.optional(),
});

const zLookAlikeFilter = z.strictObject({
    value: z.string().optional(),
    company_id: z.number().optional(),
    _company_name: z.string().optional(),
    _industry: z.string().optional(),
    _categories_and_keywords: z.array(z.string()).optional(),
    _technologies_used: z.array(z.string()).optional(),
    _competitors: z.array(z.string()).optional(),
    _annual_revenue: z.number().optional(),
    _followers_count_linkedin: z.number().optional(),
    _total_website_visits_monthly: z.number().optional(),
    _ownership_status: z.string().optional(),
});

const zVisitsBreakdownByCountryFilter = z.strictObject({
    country: z.string().optional(),
    percentage: zRange.optional(),
});

const zVisitsBreakdownByGenderFilter = z.strictObject({
    gender: z.enum(["male", "female"]).optional(),
    percentage: zRange.optional(),
});

export const zSearchCompanies = z.strictObject({
    signalIds: z.array(z.number().min(1).max(10)).optional(),
    newsIds: z.array(z.number()).optional(),
    company_name: zIncludesExcludesExactMatch.optional(),
    company_hq_location: zIncludesExcludesExactMatch.optional(),
    company_founded_year: zRange.optional(),
    company_industry: zIncludesExcludes.optional(),
    company_domain: zIncludesExcludes.optional(),
    type: z.enum([
        "Privately Held",
        "Public Company",
        "Self-Owned",
        "Self-Employed",
        "Partnership",
        "Nonprofit",
        "Educational",
        "Government Agency",
    ]).optional(),
    sic_codes: zIncludes.optional(),
    naics_codes: zIncludes.optional(),
    product_reviews_score_change: zReviewScoreChange.optional(),
    is_b2b: z.boolean().optional(),
    is_saas: z.boolean().optional(),
    technologies_used: zIncludes.optional(),
    last_funding_round_name: zIncludes.optional(),
    last_funding_round_amount_raised: zRange.optional(),
    last_funding_round_announced_date: zRange.optional(),
    funding_rounds_name: zIncludes.optional(),
    company_funding_amount: zRange.optional(),
    company_funding_date: zRange.optional(),
    company_annual_revenue: zRange.optional(),
    company_size: zRange.optional(),
    employee_count_seniority: z.array(zSeniorityCountFilter).optional(),
    employee_count_department: z.array(zDepartmentCountFilter).optional(),
    base_salary: z.array(zBaseSalaryFilter).optional(),
    ownership_status: z.enum(["Private", "Public", "Other"]).optional(),
    website: zIncludes.optional(),
    look_alike_company_name: z.array(zLookAlikeFilter).max(5).optional(),
    linkedin_url: zIncludesExcludesExactMatch.optional(),
    followers_count_linkedin: zRange.optional(),
    active_job_postings_title: zIncludes.optional(),
    active_job_postings_count: zRange.optional(),
    total_website_visits_monthly: zRange.optional(),
    rank_global: zRange.optional(),
    visits_breakdown_by_country: z.array(zVisitsBreakdownByCountryFilter)
        .optional(),
    visits_breakdown_by_gender: z.array(zVisitsBreakdownByGenderFilter)
        .optional(),
    product_reviews_aggregate_score: zRange.optional(),
    product_reviews_count: zRange.optional(),
    employee_reviews_total_count: zRange.optional(),
    employee_reviews_aggregate_score: zRange.optional(),
    employee_reviews_business_outlook: zRange.optional(),
    employee_reviews_ceo_approval: zRange.optional(),
    employee_reviews_career_opportunities: zRange.optional(),
    employee_reviews_recommend: zRange.optional(),
    employee_reviews_work_life_balance: zRange.optional(),
    employee_reviews_culture_values: zRange.optional(),
    keywords: zIncludes.optional(),
    social_urls: zIncludes.optional(),
    page: z.number().min(1).max(400).optional(),
    tab: z.enum(["total", "netNew"]).optional(),
});
