import { z } from "zod";

/**
 * POST /api/v1/verify_inline query — the vendor mirror
 * (truelist.io/docs/api, 2026-10-15). One address per call; the
 * request has no body.
 */
export const zVerifyInlineQueryParams = z.object({
    email: z.string().email().describe("The email address to verify."),
}).strict();
