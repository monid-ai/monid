import { z } from "zod";
import { zContext, zProductRef } from "../../../schema/common.ts";

/** `get_product` arguments (mirror of the server's inputSchema). */
export const zGetProductBody = z.object({
    catalog: z.object({
        id: zProductRef,
        context: zContext.optional(),
    }),
});
