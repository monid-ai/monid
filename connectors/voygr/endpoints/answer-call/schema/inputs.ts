import { z } from "zod";

const zRequestId = z.string().max(64);

/**
 * `POST /calls/{call_id}/answer`: exactly one of `answer` or `outcome`.
 * One arm each, so the rule is in the compiled schema and a body with both,
 * or with neither, is refused before the wire. `mode` is left out: VOYGR
 * accepts only `voice`, which is its default.
 */
export const zAnswerBody = z.union([
    z.strictObject({
        answer: z.string().min(1).max(4000).describe(
            "What the agent says aloud to the person on the line. Write " +
                "words that can be spoken. Send this or `outcome`, not both.",
        ),
        request_id: zRequestId.optional().describe(
            "The `request_id` of the question this answers, from " +
                "`pending_questions` on voygr#get-call. Left out, the answer " +
                "goes to the oldest open question.",
        ),
    }),
    z.strictObject({
        outcome: z.enum(["timeout", "transport_failure"]).describe(
            "Use this when you cannot answer the question: `timeout` or " +
                "`transport_failure`. It needs `request_id`, and you send " +
                "it instead of `answer`.",
        ),
        request_id: zRequestId.describe(
            "The `request_id` of the question you cannot answer.",
        ),
    }),
]);
