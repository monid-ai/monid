import { z } from "zod";
import { zDomain } from "../../../schema/common.ts";

/** GET /email-count query — the vendor mirror (docs.tomba.io
 *  api/finder#email-count, 2026-11-11). */
export const zEmailCountQueryParams = z.object({
    domain: zDomain.optional(),
    type: z.enum(["all", "personal", "generic"]).describe(
        "Count only 'personal' or only 'generic' addresses in total and in " +
            "the department and seniority counts (default 'all'). " +
            "personal_emails and generic_emails are always returned.",
    ).optional(),
}).strict();
