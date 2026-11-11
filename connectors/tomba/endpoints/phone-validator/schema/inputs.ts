import { z } from "zod";
import { zCountryCode } from "../../../schema/common.ts";

/** GET /phone-validator query — the vendor mirror (docs.tomba.io
 *  api/phone#phone-validator, 2026-11-11). */
export const zPhoneValidatorQueryParams = z.object({
    phone: z.string().min(1).describe(
        "The phone number, preferably in international format such as " +
            "'+14155550132'. Digits, spaces, hyphens, and parentheses are " +
            "accepted.",
    ).optional(),
    country_code: zCountryCode.describe(
        "Two-letter country code (ISO 3166-1 alpha-2), such as 'US', used " +
            "to read a number written without its international prefix.",
    ).optional(),
}).strict();
