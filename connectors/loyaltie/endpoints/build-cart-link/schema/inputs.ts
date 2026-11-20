import { z } from "zod";
import { zIntent, zUuid } from "../../../schema/common.ts";

/** `build_cart_link` arguments (mirror of the server's inputSchema). */
export const zBuildCartLinkBody = z.object({
    cart: z.object({
        line_items: z.array(z.object({
            id: zUuid.describe(
                "Product or variant id exactly as a search or get-product " +
                    "returned it.",
            ),
            quantity: z.number().int().min(1).max(99),
        })).min(1).max(20),
        context: z.object({ intent: zIntent.optional() }).optional(),
    }),
});
