import { z } from "zod";
import {
    CONTACT_IDENTITY_HINT,
    zContactBody,
} from "../../../schema/contact.ts";

/** The shared contact body plus `emailType`, which upstream reads as
 *  `professional` when it is absent. */
const zEmailBody = zContactBody.extend({
    emailType: z.enum(["professional", "personal", "any"]).describe(
        "Kind of email to find: `professional` (what upstream looks for " +
            "when the field is absent), `personal`, or `any` for either.",
    ).optional(),
});

/** POST /v2/contact/email body: the finders' one-of rule over it. */
export const zContactEmailBody = z.union([
    zEmailBody.required({ url: true }),
    zEmailBody.required({ fullName: true, companyDomain: true }),
    zEmailBody.required({
        firstName: true,
        lastName: true,
        companyDomain: true,
    }),
]).describe(CONTACT_IDENTITY_HINT);
