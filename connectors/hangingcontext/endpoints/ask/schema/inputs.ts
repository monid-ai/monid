import { z } from "zod";

/** GET /ask query params — the vendor mirror
 *  (https://hangingcontext.com/openapi.json, 2026-10-24). The vendor makes
 *  `query` optional (without it the reply is a help page); the endpoint
 *  binding requires it. */
export const zHangingContextAskQueryParams = z.object({
    query: z.string().min(1).max(500).optional().describe(
        "The question, in plain words. Example: 'What did central banks " +
            "say this week?'.",
    ),
}).strict();
