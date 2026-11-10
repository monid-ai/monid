import { z } from "zod";
import { enrichmentOptions } from "./common.ts";

/** Provide a primary identifier, or name plus context; the API validates matching combinations. */
export const zPersonEnrichBody = z.strictObject({
    email: z.string().nullable().optional(),
    email_hash: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    linkedin_id: z.string().nullable().optional(),
    social_url: z.string().nullable().optional(),
    legion_id: z.string().nullable().optional(),
    full_name: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional(),
    job_title: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    school: z.string().nullable().optional(),
    birth_date: z.string().nullable().optional(),
    ...enrichmentOptions,
});
