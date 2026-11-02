import { z } from "zod";

const zContactStatusFields = z.strictObject({
    linkedinUrl: z.string().min(1).max(2048).describe(
        "The person's LinkedIn profile, e.g. " +
            "`https://www.linkedin.com/in/jane-doe`: the most precise way to " +
            "name them.",
    ).optional(),
    name: z.string().min(1).max(255).describe(
        "The person's full name, e.g. `Jane Doe`, with `companyDomain` when " +
            "no `linkedinUrl` is sent.",
    ).optional(),
    companyDomain: z.string().min(1).max(253).describe(
        "The employer's website domain, e.g. `stripe.com`.",
    ).optional(),
});

/**
 * `POST /data/people/contact-status` body — the mirror of Fuse's published
 * request (design D25), STRICT like the API: a `linkedinUrl`, or a `name`
 * with a `companyDomain`. Unlike the lookups it takes no `companyName`:
 * turning a name into a domain asks a provider, and this check asks none.
 */
export const zContactStatusBody = z.union([
    zContactStatusFields.required({ linkedinUrl: true }),
    zContactStatusFields.required({ name: true, companyDomain: true }),
]);
