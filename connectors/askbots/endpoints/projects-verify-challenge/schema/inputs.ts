import { z } from "zod";

/** `{id}` of the AskBots project. */
export const zProjectPathParams = z.object({
    id: z.string().min(1).describe("AskBots project id."),
});

/** POST /projects/{id}/verify-challenge body. */
export const zVerifyBody = z.object({
    challengeId: z.string().min(1).describe(
        "`challengeId` returned by POST /projects/{id}/respond.",
    ),
    answer: z.string().describe(
        "Answer to the challenge prompt, as a string.",
    ),
});
