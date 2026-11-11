import { z } from "zod";

/** Shared fragments for the Tomba endpoint schemas — the vendor mirror
 *  (docs.tomba.io OpenAPI `schema/paths/*.yaml` and the remote MCP tools
 *  reference, 2026-11-11). Only what two or more endpoints use lives
 *  here. */

/** A bare domain name — the MCP server's own validation pattern. */
export const zDomain = z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .describe(
        "Company domain, such as 'stripe.com' — no scheme or path.",
    );

/** Company name identifier (3-75 chars upstream). */
export const zCompanyName = z.string().min(3).max(75).describe(
    "Company name, such as 'Stripe'. A domain gives better results.",
);

/** An email address. */
export const zEmail = z.string().email().describe(
    "Email address, such as 'jane.doe@stripe.com'.",
);

/** A LinkedIn profile URL. */
export const zLinkedinUrl = z.string().regex(/linkedin\.com/).describe(
    "LinkedIn profile URL, such as 'https://www.linkedin.com/in/jane-doe'.",
);

/** Two-letter country code (ISO 3166-1 alpha-2). */
export const zCountryCode = z.string().length(2).describe(
    "Two-letter country code (ISO 3166-1 alpha-2), such as 'US'.",
);

/** The phone add-on of the finder family. */
export const zEnrichMobile = z.boolean().describe(
    "Set to true to also get the person's phone numbers in `phone_data`. " +
        "Phone numbers cost 5 extra search credits.",
);
