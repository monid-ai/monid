import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompaniesFindQueryParams } from "./schema/inputs.ts";

/** GET /companies/find — a company profile from its domain. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Company",
        summary:
            "Look up a company's full profile — industry, size, location, tech stack — from its domain.",
        description: "Resolve a domain into a company profile. Returns " +
            "name and legal name, description, category (sector, " +
            "industry, GICS/SIC/NAICS codes), tags, founding year, " +
            "headquarters geo, phone, site emails, logo, social handles " +
            "(LinkedIn, Twitter, Crunchbase, Instagram), employee range " +
            "and traffic rank metrics, detected technologies with " +
            "categories, funding rounds, and parent-company pointers, in " +
            "the Clearbit-compatible camelCase shape. An unknown domain " +
            "answers 404 and costs nothing. Suited for firmographic " +
            "enrichment, account qualification, and tech-stack research.",
        docsUrl: "https://hunter.io/api-documentation/v2#company-enrichment",
        categories: ["company-enrichment"],
        notes: ["A miss (404) costs nothing."],
    },
    request: { method: "GET", path: "/companies/find" },
    input: { schema: { queryParams: zCompaniesFindQueryParams } },
    usage: {
        /** 0.2 credit per hit — v1's drill (design D3). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "profiles",
            consumes: { credit: "default", amount: 0.2 },
        },
    },
});
