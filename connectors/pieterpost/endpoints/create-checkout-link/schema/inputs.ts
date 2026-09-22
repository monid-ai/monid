import { z } from "zod";
import {
    zPieterPostCheckoutCommon,
    zPieterPostLetter,
    zPieterPostPostcard,
} from "../../../schema/common.ts";

const zPieterPostLetterCheckout = z.object({
    ...zPieterPostCheckoutCommon,
    requestType: z.literal("letter"),
    letters: z.array(zPieterPostLetter).min(1).max(25).describe(
        "One text-only letter per recipient, up to 25 recipients.",
    ),
}).strict();

const zPieterPostPostcardCheckout = z.object({
    ...zPieterPostCheckoutCommon,
    requestType: z.literal("postcard"),
    postcard: zPieterPostPostcard,
}).strict();

export const zPieterPostCheckoutLinkBody = z.discriminatedUnion(
    "requestType",
    [zPieterPostLetterCheckout, zPieterPostPostcardCheckout],
);
