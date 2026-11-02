import { z } from "zod";

const zCompanyFields = z.strictObject({
    name: z.string().min(1).max(255).describe(
        "The company's name, e.g. `Stripe`. The least precise identifier: " +
            "used only when no `domain` or `linkedinUrl` is given.",
    ).optional(),
    domain: z.string().min(1).max(253).describe(
        "The company's website domain, e.g. `stripe.com`; a full URL such " +
            "as `https://www.stripe.com/about` is reduced to its domain.",
    ).optional(),
    linkedinUrl: z.string().min(1).max(2048).describe(
        "The company's LinkedIn page, e.g. " +
            "`https://www.linkedin.com/company/stripe`, `company/stripe` or " +
            "the bare slug `stripe`.",
    ).optional(),
});

/**
 * One company to look up, as Fuse's company resolver and a company's people
 * both take it: the mirror of Fuse's published request (design D25), STRICT
 * like the API. Fuse takes AT LEAST ONE of the three identifiers, so the
 * mirror is a union of arms each requiring one.
 */
export const zCompany = z.union([
    zCompanyFields.required({ name: true }),
    zCompanyFields.required({ domain: true }),
    zCompanyFields.required({ linkedinUrl: true }),
]);
