import { z } from "zod";
import { zDraftToken } from "../../../schema/common.ts";

/** FrankKi `/checkout` body (Backend `checkoutInput`). */
export const zFrankkiCheckoutBody = z.object({
    draftToken: zDraftToken,
    locale: z.enum(["de", "en"]).describe(
        "Language of the payment page and the confirmation email. " +
            "Defaults to 'de'.",
    ).optional(),
});
