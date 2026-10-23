import { z } from "zod";

/** POST /v1/logins/password body. */
export const zLoginPasswordBody = z.object({
    label: z.string().min(1).describe(
        "Label of the agent-created login, as returned in its catalog entry.",
    ),
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
