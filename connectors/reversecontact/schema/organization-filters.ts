import { z } from "zod";
import { zLocation, zRange, zValues } from "./common.ts";

/**
 * The Organization filters, shared by `search/organizations` and
 * `search/organizations/count` (the gateway's `OrganizationFilterFields`,
 * public v2, 2026-10-21). AND-combined; at least one filter, and
 * `maxDataAgeDate` cannot be the only one.
 */
export const organizationFilterFields = {
    companyName: z.string().min(1).describe(
        "Company name, e.g. 'Stripe'.",
    ).optional(),
    companyDomain: z.string().min(1).describe(
        "Company website domain, e.g. stripe.com.",
    ).optional(),
    industry: zValues(
        "Industries, exact values of the industry taxonomy " +
            "(https://docs.reversecontact.com/guides/industries), e.g. " +
            "'Software Development', 'Financial Services'. No fuzzy " +
            "matching.",
    ).optional(),
    specialities: zValues(
        "Specialities the company lists, e.g. 'Payments'.",
    ).optional(),
    employeeCountRange: zRange(1_000_000_000, "employees").describe(
        "Headcount range.",
    ).optional(),
    foundedYear: zRange(2_100, "year").describe(
        "Founding year range.",
    ).optional(),
    followersCount: zRange(1_000_000_000, "followers").describe(
        "Follower count range of the company page.",
    ).optional(),
    location: zLocation("Where the headquarters are.").optional(),
    maxDataAgeDate: z.iso.datetime().describe(
        "Only organizations refreshed at or after this ISO 8601 date-time. " +
            "Cannot be the only filter.",
    ).optional(),
};
