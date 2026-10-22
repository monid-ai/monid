import { z } from "zod";
import { zCompanyDomain, zPersonUrl } from "./common.ts";

/**
 * The contact finders' body, shared by `contact/email` and `contact/phone`
 * (the gateway's contact body, public v2, 2026-10-21), without
 * `webhookUrl`: the lifecycle reads the result itself.
 */
const zContactBody = z.object({
    url: zPersonUrl.optional(),
    fullName: z.string().min(1).describe(
        "The person's full name, e.g. 'Jane Doe'.",
    ).optional(),
    firstName: z.string().min(1).describe("First name.").optional(),
    lastName: z.string().min(1).describe("Last name.").optional(),
    companyDomain: zCompanyDomain.optional(),
}).strict();

/** The vendor's one-of rule as three arms (its OpenAPI `oneOf`): a profile
 *  URL, a full name with the company domain, or first and last names with
 *  the company domain. */
export const zContactFinderBody = z.union([
    zContactBody.required({ url: true }),
    zContactBody.required({ fullName: true, companyDomain: true }),
    zContactBody.required({
        firstName: true,
        lastName: true,
        companyDomain: true,
    }),
]).describe(
    "Identify the person by `url`, by `fullName` + `companyDomain`, or by " +
        "`firstName` + `lastName` + `companyDomain`.",
);
