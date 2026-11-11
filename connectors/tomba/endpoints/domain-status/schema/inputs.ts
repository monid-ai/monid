import { z } from "zod";
import { zEmail } from "../../../schema/common.ts";

/** GET /domain-status query — the vendor mirror (docs.tomba.io
 *  api/domain#domain-status, 2026-11-11). Send `domain` or `email`; bound
 *  as a union in endpoint.ts. */
export const zDomainStatusQueryParams = z.object({
    domain: z.string().min(1).describe(
        "Domain to check, such as 'gmail.com'. A URL is also accepted; its " +
            "host is checked. When both domain and email are sent, domain " +
            "is used.",
    ).optional(),
    email: zEmail.describe("Email address whose domain to check.").optional(),
}).strict();
