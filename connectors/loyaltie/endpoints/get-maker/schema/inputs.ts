import { z } from "zod";
import { zIntent } from "../../../schema/common.ts";

/** `get_maker` arguments (mirror of the server's inputSchema). */
export const zGetMakerBody = z.object({
    maker: z.object({
        id: z.string().min(1).max(64).describe(
            "The brand's id (seller.id) or store link (metadata.maker.link) " +
                "from a search result, e.g. 'cimmacoffee'.",
        ),
        context: z.object({ intent: zIntent.optional() }).optional(),
    }),
});
