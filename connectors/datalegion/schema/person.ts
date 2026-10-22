import { z } from "zod";
import { zMatchControls } from "./common.ts";

/** `POST /person/enrich` body, identical for all four person products —
 *  the key, not the body, selects the product (design D1). The vendor
 *  normalizes every input.
 *
 *  v1 guarded "a primary identifier OR a name plus context" with a
 *  `.superRefine`; that cross-field rule does not survive compilation (a
 *  union would need 33 arms: six identifiers plus three names × nine
 *  contexts), so it rides the endpoints' `meta.notes` and upstream's own
 *  400 (contactout people-enrich posture, design D4). */
export const zPersonEnrichBody = z.object({
    email: z.string().min(1).optional().describe("Email address."),
    email_hash: z.string().min(1).optional().describe(
        "SHA-256, SHA-1, or MD5 hash of the normalized email address.",
    ),
    phone: z.string().min(1).optional().describe(
        "Phone number (normalized to E.164).",
    ),
    linkedin_id: z.string().min(1).optional().describe("LinkedIn numeric id."),
    social_url: z.string().min(1).optional().describe(
        "Social profile URL (LinkedIn, X/Twitter, GitHub, Facebook).",
    ),
    legion_id: z.string().min(1).optional().describe(
        "Data Legion person id (exact match).",
    ),
    full_name: z.string().min(1).optional().describe("Full name."),
    first_name: z.string().min(1).optional().describe("First name."),
    last_name: z.string().min(1).optional().describe("Last name."),
    address: z.string().min(1).optional().describe(
        "Full address string (parsed into city, state, postal code, " +
            "country).",
    ),
    city: z.string().min(1).optional().describe("City."),
    state: z.string().min(1).optional().describe("State name or code."),
    country: z.string().min(1).optional().describe("Country name or code."),
    postal_code: z.string().min(1).optional().describe("Postal or ZIP code."),
    job_title: z.string().min(1).optional().describe("Job title."),
    company: z.string().min(1).optional().describe(
        "Company name, website, or social URL.",
    ),
    school: z.string().min(1).optional().describe(
        "School name, website, or social URL.",
    ),
    birth_date: z.string().min(1).optional().describe(
        "Birth date to match or narrow a name-based lookup (YYYY-MM-DD, " +
            "YYYY-MM, or YYYY).",
    ),
    ...zMatchControls,
}).strict();

export const PERSON_IDENTIFIER_NOTE =
    "Provide one primary identifier (email, email_hash, phone, " +
    "linkedin_id, social_url, or legion_id), OR a name (full_name, " +
    "first_name, or last_name) plus at least one of address, city, state, " +
    "country, postal_code, job_title, company, school, or birth_date. " +
    "Upstream answers 400 otherwise.";
