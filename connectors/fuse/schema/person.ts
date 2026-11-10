import { z } from "zod";

const zPersonFields = z.strictObject({
    linkedinUrl: z.string().min(1).max(2048).describe(
        "The person's LinkedIn profile, e.g. " +
            "`https://www.linkedin.com/in/jane-doe`: the most precise way to " +
            "name them.",
    ).optional(),
    name: z.string().min(1).max(255).describe(
        "The person's full name, e.g. `Jane Doe`, with `companyName` or " +
            "`companyDomain` when no `linkedinUrl` is sent.",
    ).optional(),
    companyName: z.string().min(1).max(255).describe(
        "The person's current employer, e.g. `Stripe`.",
    ).optional(),
    companyDomain: z.string().min(1).max(253).describe(
        "The employer's website domain, e.g. `stripe.com`: more precise " +
            "than `companyName`.",
    ).optional(),
});

/**
 * One person to look up, as Fuse's email lookup, phone lookup and bulk job
 * all take them: a `linkedinUrl`, or a `name` with a `companyName` or
 * `companyDomain`. Fuse refuses anything else (422 `PERSON_NOT_IDENTIFIABLE`
 * or `VALIDATION_FAILED`), so the mirror is the union of the three ways in.
 */
export const zPerson = z.union([
    zPersonFields.required({ linkedinUrl: true }),
    zPersonFields.required({ name: true, companyName: true }),
    zPersonFields.required({ name: true, companyDomain: true }),
]);
