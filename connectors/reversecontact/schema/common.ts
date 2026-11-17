import { z } from "zod";

/**
 * Shared fragments for the Reverse Contact endpoint schemas, mirrored from
 * the gateway's own validators (public v2, 2026-10-21) and its published
 * OpenAPI document (`https://api.reversecontact.com/openapi.json`).
 *
 * Two fields the gateway accepts are left out on purpose, on every body:
 *
 *   - `issuer`: an attribution label for Reverse Contact's own surfaces.
 *   - `webhookUrl` (contact finders): the result would be pushed to a URL
 *     the caller names, outside the run that paid for it. The lifecycle
 *     reads the result itself.
 */

/** A person's public profile URL, exactly as the gateway's pattern reads it
 *  (case-sensitive, scheme optional, 2-3 letter locale subdomain allowed,
 *  Sales Navigator lead URLs accepted and normalized upstream). */
export const zPersonUrl = z.string().regex(
    /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/(in|sales\/lead)\/[^/\s]+\/?$/,
).describe(
    "The person's public LinkedIn profile URL, e.g. " +
        "https://www.linkedin.com/in/janedoe.",
);

/** A company's public page URL, the gateway's company pattern. */
export const zCompanyUrl = z.string().regex(
    /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/(company|sales\/company)\/[^/\s]+\/?$/,
).describe(
    "The company's public LinkedIn page URL, e.g. " +
        "https://www.linkedin.com/company/stripe.",
);

/** Reverse Contact's own person id, carried by every person it returns. */
export const zPersonId = z.string().regex(/^prs_[A-Za-z0-9]+$/).describe(
    "Reverse Contact person id (`prs_...`), as returned in the `id` of " +
        "any person record.",
);

/** Reverse Contact's own company id, carried by every company it returns. */
export const zCompanyId = z.string().regex(/^com_[A-Za-z0-9]+$/).describe(
    "Reverse Contact company id (`com_...`), as returned in the `id` of " +
        "any company record.",
);

/** A company domain; the gateway normalizes a URL or `www.` form. */
export const zCompanyDomain = z.string().min(1).describe(
    "Company website domain, e.g. stripe.com.",
);

/** Cursor pagination shared by every search route. */
export const paginationFields = {
    cursor: z.string().min(1).describe(
        "Opaque cursor from a previous page's `data.metadata.nextCursor`. " +
            "Pass it back unchanged, with the same filters.",
    ).optional(),
    perPage: z.number().int().min(1).max(100).describe(
        "Results per page, 1 to 100. Each delivered result is one credit.",
    ).optional(),
};

/** The vendor's documented page size when `perPage` is absent. */
export const DEFAULT_PER_PAGE = 25;

/** An inclusive numeric range; either bound may be omitted. */
export const zRange = (max: number, unit: string) =>
    z.object({
        min: z.number().int().min(0).max(max).describe(
            `Lower bound (${unit}), inclusive.`,
        ).optional(),
        max: z.number().int().min(0).max(max).describe(
            `Upper bound (${unit}), inclusive.`,
        ).optional(),
    }).strict();

/** A multi-value filter: a list, always (a record matches any value). */
export const zValues = (describe: string) =>
    z.array(z.string().min(1)).min(1).max(20).describe(
        `${describe} A list of 1 to 20 values; a record matches any of them.`,
    );

/** A location filter, shared by the people and organization filters. */
export const zLocation = (describe: string) =>
    z.object({
        country: zValues(
            "Country names in English, e.g. 'France'. Never an ISO code.",
        ).optional(),
        countryCode: z.array(z.string().length(2)).min(1).max(20).describe(
            "ISO 3166-1 alpha-2 country codes, e.g. 'FR' or 'US'.",
        ).optional(),
        region: zValues("Regions or states, e.g. 'California'.").optional(),
        city: zValues("Cities, e.g. 'Paris'.").optional(),
    }).strict().describe(describe);

/** The natural-language prompt both prompt searches read. */
export const zPrompt = z.string().min(3).max(4_000).describe(
    "What to search for, in plain language (3 to about 4,000 characters), " +
        "e.g. 'VPs of Sales at French SaaS companies with 50 to 200 " +
        "employees'.",
);
