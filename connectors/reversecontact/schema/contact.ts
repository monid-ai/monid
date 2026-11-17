import { z } from "zod";
import { zCompanyDomain, zPersonUrl } from "./common.ts";

/**
 * The contact finders' body, shared by `contact/email` and `contact/phone`
 * (the gateway's contact body, public v2, 2026-10-27), without
 * `webhookUrl`: the lifecycle reads the result itself.
 */
export const zContactBody = z.object({
    url: zPersonUrl.optional(),
    fullName: z.string().min(1).describe(
        "The person's full name, e.g. 'Jane Doe'.",
    ).optional(),
    firstName: z.string().min(1).describe("First name.").optional(),
    lastName: z.string().min(1).describe("Last name.").optional(),
    companyDomain: zCompanyDomain.optional(),
}).strict();

/** How a finder body states its one-of rule. */
export const CONTACT_IDENTITY_HINT = "Identify the person by `url`, by " +
    "`fullName` + `companyDomain`, or by `firstName` + `lastName` + " +
    "`companyDomain`.";

/** The vendor's one-of rule as three arms (its OpenAPI `oneOf`): a profile
 *  URL, a full name with the company domain, or first and last names with
 *  the company domain. The email finder builds the same three arms over
 *  its own body, which adds `emailType`. */
export const zContactFinderBody = z.union([
    zContactBody.required({ url: true }),
    zContactBody.required({ fullName: true, companyDomain: true }),
    zContactBody.required({
        firstName: true,
        lastName: true,
        companyDomain: true,
    }),
]).describe(CONTACT_IDENTITY_HINT);
