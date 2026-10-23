import { z } from "zod";

/** POST /v1/logins/requests body. */
export const zLoginRequestBody = z.object({
    website: z.string().min(1).describe(
        "Domain of the site to open an account on.",
    ),
    email: z.string().min(1).describe(
        "Email address to register with.",
    ),
    username: z.string().min(4).describe(
        "Username to register with, at least 4 characters.",
    ).optional(),
    minLength: z.number().int().max(64).describe(
        "Minimum password length the site requires. Values above 64 are refused with `invalid_policy`.",
    ).optional(),
    maxLength: z.number().int().describe(
        "Maximum password length the site allows. Below 12 is refused with `password_too_short`.",
    ).optional(),
    noSymbols: z.boolean().describe(
        "True if the site rejects symbols.",
    ).optional(),
    symbols: z.string().describe(
        "Symbols the site allows. Must be a subset of `!@#$*+-_=.?`, or the call is refused with `invalid_policy`.",
    ).optional(),
    noRepeats: z.boolean().describe(
        "True if the site rejects three identical characters in a row.",
    ).optional(),
});
