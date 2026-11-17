import { z } from "zod";
import {
    zCompanyName,
    zDomain,
    zEnrichMobile,
} from "../../../schema/common.ts";

/** GET /email-finder query — the vendor mirror (docs.tomba.io
 *  api/finder#email-finder, 2026-11-11). Identify the company (domain or
 *  company) and the person (first_name + last_name, or full_name); bound
 *  as a union in endpoint.ts. `webhook_url` is left out (design D5). */
export const zEmailFinderQueryParams = z.object({
    domain: zDomain.describe(
        "Company domain, such as 'stripe.com'. When both domain and company " +
            "are sent, domain is used.",
    ).optional(),
    company: zCompanyName.optional(),
    first_name: z.string().min(1).max(40).describe("The person's first name.")
        .optional(),
    last_name: z.string().min(1).max(40).describe("The person's last name.")
        .optional(),
    full_name: z.string().min(5).max(80).describe(
        "The person's full name, used when first_name and last_name aren't " +
            "both sent.",
    ).optional(),
    enrich_mobile: zEnrichMobile.optional(),
}).strict();
