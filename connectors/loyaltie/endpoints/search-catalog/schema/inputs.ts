import { z } from "zod";
import { zContext } from "../../../schema/common.ts";

/** `search_catalog` arguments (mirror of the server's inputSchema). */
export const zSearchCatalogBody = z.object({
    catalog: z.object({
        query: z.string().min(1).max(500).describe(
            "The product words only, short, e.g. 'pasta' or 'whole bean " +
                "coffee'. Every word must match a product, so put the " +
                "person's wider task in context.intent and hard " +
                "requirements in filters.",
        ),
        context: zContext.optional(),
        filters: z.object({
            price: z.object({
                min: z.number().int().min(0).optional().describe(
                    "Minimum price in cents, e.g. 1000 for $10.",
                ),
                max: z.number().int().min(0).optional().describe(
                    "Maximum price in cents, e.g. 2500 for $25.",
                ),
            }).optional(),
            regular_delivery: z.boolean().optional().describe(
                "true: only products that can be delivered on a schedule " +
                    "(weekly to every 3 months).",
            ),
            ships_from: z.array(z.object({
                country: z.string().length(2).describe("e.g. US"),
                region: z.string().min(1).optional().describe(
                    "US state, e.g. TX",
                ),
            })).optional().describe(
                "Only brands based in these places.",
            ),
        }).optional(),
        pagination: z.object({
            limit: z.number().int().min(1).max(50).optional().describe(
                "Results per page, 1 to 50 (server default 10).",
            ),
            cursor: z.string().optional().describe(
                "The next-page cursor a previous search returned.",
            ),
        }).optional(),
    }),
});
