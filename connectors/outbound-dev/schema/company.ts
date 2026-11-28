import { z } from "zod";

const zCompanyFields = z.strictObject({
    name: z.string().min(1).max(255).describe(
        "The company's name, e.g. `A.P. Moller - Maersk`. The least precise " +
            "identifier: used only when no `domain` or `linkedinUrl` is sent.",
    ).optional(),
    domain: z.string().min(1).max(253).describe(
        "The company's website domain, e.g. `maersk.com`.",
    ).optional(),
    linkedinUrl: z.string().min(1).max(2048).describe(
        "The company's LinkedIn page URL, e.g. " +
            "`https://www.linkedin.com/company/maersk-group`.",
    ).optional(),
});

/**
 * One company to look up, as outbound.dev's company resolver and a company's
 * people both take it: the mirror of the published request (design D25),
 * STRICT like the API. outbound.dev takes AT LEAST ONE of the three
 * identifiers, so the mirror is a union of arms each requiring one.
 */
export const zCompany = z.union([
    zCompanyFields.required({ name: true }),
    zCompanyFields.required({ domain: true }),
    zCompanyFields.required({ linkedinUrl: true }),
]);
