import { z } from "zod";
import {
    zDeliveryType,
    zDraftToken,
    zRecipient,
    zSender,
} from "../../../schema/common.ts";

/** FrankKi `/compose` body (Backend `composeInput`, minus attachments). */
export const zFrankkiComposeBody = z.object({
    draftToken: zDraftToken.describe(
        "Pass the draftToken of an earlier compose to revise that draft " +
            "(it gets a new version). Omit to start a new letter.",
    ).optional(),
    subject: z.string().min(1).max(200).describe(
        "Subject line printed in bold above the body.",
    ),
    content: z.string().min(1).max(30_000).describe(
        "Full letter body as plain text, from the salutation to the " +
            "closing and the sender's name. FrankKi prints it exactly as " +
            "given and adds no salutation or closing of its own. Use \\n " +
            "for line breaks.",
    ),
    sender: zSender,
    recipient: zRecipient,
    language: z.enum(["de", "en"]).describe(
        "Language of the printed date and labels. Defaults to 'de'.",
    ).optional(),
    pageCount: z.number().int().min(1).max(95).describe(
        "Expected page count. The rendered PDF decides the real count.",
    ).optional(),
    country: z.string().length(2).describe(
        "Recipient country code. The recipient address wins if they differ.",
    ).optional(),
    deliveryType: zDeliveryType.optional(),
    color: z.boolean().describe(
        "Print in colour. Defaults to false.",
    ).optional(),
});
