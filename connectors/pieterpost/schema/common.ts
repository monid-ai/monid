import { z } from "zod";

export const zPieterPostIdempotencyKey = z.string().min(1).max(140).describe(
    "Stable key for this create operation. Reuse the same key after a timeout " +
        "so PieterPost returns the original resource instead of creating a duplicate.",
);

export const zPieterPostLocale = z.enum([
    "de",
    "en",
    "es",
    "fr",
    "it",
    "nl",
    "pl",
    "pt",
]);

export const zPieterPostMetadata = z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
).describe(
    "Optional correlation metadata. PieterPost keeps at most 20 primitive entries.",
);

export const zPieterPostRecipient = z.object({
    name: z.string().min(1).max(140).describe("Recipient name."),
    addressLines: z.array(z.string().min(1).max(140)).min(1).max(4)
        .optional().describe(
            "Preformatted address lines, excluding the recipient name. " +
                "Use these or the structured address fields.",
        ),
    streetAddress: z.string().min(1).max(140).optional().describe(
        "Complete street and house-number line when addressLines is omitted.",
    ),
    street: z.string().min(1).max(140).optional(),
    number: z.string().min(1).max(140).optional(),
    postalCode: z.string().min(1).max(140).optional(),
    city: z.string().min(1).max(140).optional(),
    state: z.string().min(1).max(140).optional().describe(
        "State or region when required by the destination country.",
    ),
    country: z.string().min(2).max(140).optional().describe(
        "Destination country name or ISO code.",
    ),
    extra: z.string().min(1).max(140).optional().describe(
        "Optional company, unit, department, or other delivery line.",
    ),
    id: z.string().min(1).max(140).optional().describe(
        "Optional caller-side recipient identifier.",
    ),
    customFields: z.record(z.string(), z.string()).optional().describe(
        "Optional template values retained with the recipient.",
    ),
}).strict();

export const zPieterPostLetter = z.object({
    message: z.string().min(1).max(6_000).describe(
        "Letter text. Newlines are preserved.",
    ),
    recipient: zPieterPostRecipient,
}).strict();

const zPieterPostSinglePostcard = z.object({
    message: z.string().min(1).max(1_200).describe("Postcard message."),
    recipient: zPieterPostRecipient,
}).strict();

const zPieterPostBulkPostcard = z.object({
    message: z.string().min(1).max(1_200).describe(
        "Shared postcard message for every recipient.",
    ),
    recipients: z.array(zPieterPostRecipient).min(1).max(25),
}).strict();

export const zPieterPostPostcard = z.union([
    zPieterPostSinglePostcard,
    zPieterPostBulkPostcard,
]);

export const zPieterPostCheckoutCommon = {
    acceptUsAddressWarnings: z.boolean().optional().describe(
        "Set true only after reviewing and accepting US unit/address warnings " +
            "returned by a previous request.",
    ),
    externalId: z.string().min(1).max(140).optional().describe(
        "Optional caller-side order identifier.",
    ),
    idempotencyKey: zPieterPostIdempotencyKey,
    locale: zPieterPostLocale.optional(),
    metadata: zPieterPostMetadata.optional(),
    paymentMethod: z.enum(["auto", "card", "ideal"]).optional().describe(
        "Hosted checkout payment method. auto is recommended; ideal is only " +
            "available for EUR orders.",
    ),
    returnUrl: z.string().url().describe(
        "URL that receives checkout=success or checkout=cancelled.",
    ),
    senderEmail: z.string().email().describe(
        "Email address used for the hosted checkout and order contact.",
    ),
};
