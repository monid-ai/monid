import { z } from "zod";

/**
 * `POST /campaign/{id}/participant` body — a faithful mirror of
 * GrowSurf's `CreateParticipantRequest`, optionality only.
 */
const REFERRAL_STATUSES = ["CREDIT_PENDING", "CREDIT_AWARDED"] as const;

export const zAddParticipantBody = z.object({
    // z.string().email() is the spelling this repo already compiles
    // (hunterio) — the JSON Schema it emits is what ajv validates on
    email: z.string().email().describe(
        "The participant's email address. This is the identity: adding " +
            "an address that is already enrolled returns the existing " +
            "participant unchanged rather than creating a second one.",
    ),
    referredBy: z.string().min(1).max(100).optional().describe(
        "Who referred this person — the referrer's participant id or " +
            "email address. Sets the attribution on the new participant.",
    ),
    isAffiliate: z.boolean().optional().describe(
        "Affiliate programs only. `true` enrolls the new participant as " +
            "an approved affiliate, `false` creates a plain participant. " +
            "Omitted, a valid `referredBy` creates a referred " +
            "non-affiliate and no referrer enrolls an approved affiliate. " +
            "Ignored for a participant who already exists.",
    ),
    referralStatus: z.enum(REFERRAL_STATUSES).optional().describe(
        "Whether the referrer's credit is already awarded " +
            "(`CREDIT_AWARDED`) or still waiting (`CREDIT_PENDING`). " +
            "Meaningful only when `referredBy` resolves to a real " +
            "referrer; omitted, GrowSurf derives it from the program's " +
            "own referral trigger.",
    ),
    firstName: z.string().min(1).max(255).optional().describe(
        "The participant's first name.",
    ),
    lastName: z.string().min(1).max(255).optional().describe(
        "The participant's last name.",
    ),
    ipAddress: z.string().min(1).optional().describe(
        "The participant's IP address, when you have it. Used for fraud " +
            "signals.",
    ),
    fingerprint: z.string().min(1).optional().describe(
        "Browser identifier for this participant, when you have one. " +
            "Used for fraud signals.",
    ),
    mobileInstanceId: z.string().min(1).optional().describe(
        "App-install scoped identifier supplied by a native app. The " +
            "official GrowSurf mobile SDKs generate a lowercase UUID.",
    ),
    metadata: z.record(z.string(), z.unknown()).optional().describe(
        "Your own shallow key/value data to store on the participant, " +
            'for example {"customerId": "12345"}. GrowSurf stores and ' +
            "compares the values as strings.",
    ),
});
