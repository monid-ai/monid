import { z } from "zod";

/**
 * `POST /v1/contact-search` body — OpenAPI `ContactSearchRequest`
 * (docs.lev8.com/openapi.yaml, 2026-10-16). STRICT, as Lev8's is.
 */
export const zLev8ContactSearchBody = z.strictObject({
    contact_type: z.enum(["email", "phone"]).describe(
        "What to find: `email` (10 credits when found) or `phone` (30 " +
            "credits when found).",
    ),
    objective: z.string().min(1).max(4000).describe(
        "Who the contact is and what to find, 1 to 4,000 characters. " +
            "Include identity signals: name, title, company, plus a " +
            "LinkedIn URL, website, or X/YouTube/TikTok/Instagram/GitHub " +
            "handle. More specific signals match more accurately.",
    ),
});
