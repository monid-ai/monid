import { z } from "zod";

/**
 * POST /v1/apply/{id} body — every control for one running application in
 * one route (jobs-api `public/router.ts`, 2026-10-30): `status` reads it
 * (same as GET /v1/apply/{id}); `continue`, `approve_submit` and `stop` run
 * the matching /continue, /approve-submit and /stop handlers.
 */
export const zApplyApplicationBody = z.discriminatedUnion("action", [
    z.strictObject({
        action: z.literal("status").describe(
            "Read where the application stands.",
        ),
    }),
    z.strictObject({
        action: z.literal("continue").describe(
            "Answer the questions it is waiting on (status awaiting_input).",
        ),
        answers: z.record(z.string(), z.string()).describe(
            "The person's answers, keyed by each entry's `key` (or label) " +
                'in `session.questions`, e.g. {"visa_status": "US citizen"}.',
        ),
    }),
    z.strictObject({
        action: z.literal("approve_submit").describe(
            "Submit an application held for review (status " +
                "awaiting_submit, only when started with auto_submit: false).",
        ),
    }),
    z.strictObject({
        action: z.literal("stop").describe(
            "Stop the application before it submits.",
        ),
    }),
]);
