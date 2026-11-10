import { z } from "zod";

const ROLE_CLUSTERS = [
    "business_operations_and_management",
    "design",
    "education",
    "food_and_hospitality",
    "hardware_engineering",
    "healthcare",
    "legal",
    "logistics_and_warehouse",
    "manufacturing",
    "other_specialized",
    "product",
    "retail",
    "sales_and_business_development",
    "software_engineering",
    "trades",
] as const;

/**
 * Faithful mirror of Clera's `job.search.list_public` input
 * (POST /api/public/jobs/search). Clera applies the page and per_page
 * defaults server side, so the mirror keeps them optional.
 */
export const zCleraJobSearchBody = z.object({
    search_term: z.string().max(200).describe(
        "Free-text search over job title, role names and keywords. " +
            "Example: 'backend engineer'. Omit to list the newest roles.",
    ).optional(),
    cities: z.array(z.string()).max(20).describe(
        "Cities to match, exact spelling as Clera stores them. Example: " +
            "['San Francisco', 'Berlin']. Get the live list from " +
            "clera#job-filters.",
    ).optional(),
    work_types: z.array(z.string()).max(5).describe(
        "Workplace types. Values in use: 'on-site', 'hybrid', 'remote', " +
            "'on-site or remote'.",
    ).optional(),
    role_cluster: z.array(z.enum(ROLE_CLUSTERS)).max(8).describe(
        "Role families. Example: ['software_engineering', 'product'].",
    ).optional(),
    company_last_funding_round: z.array(z.string()).max(12).describe(
        "The company's latest funding stage. Values in use: 'Bootstrapped', " +
            "'Pre-seed', 'Seed', 'Series A', 'Series B'.",
    ).optional(),
    min_salary: z.number().int().min(0).describe(
        "Minimum salary in the listing's currency. Only roles that state a " +
            "salary match. Example: 150000.",
    ).optional(),
    visa_sponsorship: z.boolean().describe(
        "true returns only roles that sponsor visas.",
    ).optional(),
    page: z.number().int().min(1).max(40).describe(
        "1-indexed page. Defaults to 1. Maximum 40.",
    ).optional(),
    per_page: z.number().int().min(1).max(48).describe(
        "Results per page. Defaults to 24. Maximum 48.",
    ).optional(),
}).strict();
