import { z } from "zod";
import { zLimit } from "../../../schema/common.ts";

/** GET /ideas query params — faithful mirror of the published OpenAPI
 *  (2026-10-12). */
export const zIdeasQueryParams = z.object({
    direction: z.enum(["rising", "fading"]).describe(
        "'rising' for ideas gaining share of new AI research papers, " +
            "'fading' for ideas losing it.",
    ),
    limit: zLimit.optional(),
}).strict();
