import { z } from "zod";
import { zMatchControls } from "./common.ts";

/** `POST /person/enrich` body: a primary identifier, or a name plus
 *  context. The vendor normalizes every input. */
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
}).strict().describe(
    "Pass a primary identifier (email, email_hash, phone, social_url, " +
        "linkedin_id, or legion_id), or a name plus context (location, " +
        "company, school, job_title, or birth_date).",
);
