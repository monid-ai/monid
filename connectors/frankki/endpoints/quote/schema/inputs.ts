import { z } from "zod";
import { zDeliveryType } from "../../../schema/common.ts";

/** FrankKi `/quote` body (Backend `quoteInput`). */
export const zFrankkiQuoteBody = z.object({
    pageCount: z.number().int().min(1).max(95).describe(
        "Number of printed pages, 1 to 95. An A4 page holds roughly 2,500 " +
            "characters of body text.",
    ),
    country: z.string().length(2).describe(
        "Two-letter ISO country code of the recipient, e.g. 'DE'.",
    ),
    deliveryType: zDeliveryType.optional(),
    color: z.boolean().describe(
        "Price colour printing. Defaults to false (black and white).",
    ).optional(),
});
