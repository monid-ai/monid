import { z } from "zod";
import { zDomain, zEmail, zLinkedinUrl } from "../../../schema/common.ts";

/** GET /phone-finder query — the vendor mirror (docs.tomba.io
 *  api/phone#phone-finder, 2026-11-11). Send at least one of email,
 *  domain, linkedin; bound as a union in endpoint.ts. `webhook_url` is
 *  left out (design D5). */
export const zPhoneFinderQueryParams = z.object({
    email: zEmail.describe(
        "Email address of the person, such as 'jane.doe@stripe.com'.",
    ).optional(),
    domain: zDomain.describe(
        "Company domain, such as 'stripe.com', to get the company's phone " +
            "number.",
    ).optional(),
    linkedin: zLinkedinUrl.optional(),
    full: z.boolean().describe(
        "Set to true to get an array of every number found instead of a " +
            "single number.",
    ).optional(),
}).strict();
