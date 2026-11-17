import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `whatsapp/numbers` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/whatsapp/numbers). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWhatsappNumbersBody = z.object({
    phoneNumbers: z.array(z.string()).max(1000)
        .describe(
            "Phone numbers to validate, each with + and the country code, for example +14155552671. Spaces, dashes, dots and brackets are fine, and 00 works in place of +. A number without its country code may be read as another country's number. Up to 1,000 numbers per request; one row per distinct number.",
        ),
}).strict();
