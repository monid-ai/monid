import { z } from "zod";

/**
 * The `{call_id}` path of `get-call`, `answer-call` and `cancel-call`.
 * Strict, so a typo'd key is refused here instead of reaching VOYGR as a
 * path with no id.
 */
export const zCallPathParams = z.strictObject({
    call_id: z.string().min(1).describe(
        "The call's id: `call_id` on a call from voygr#place-call or " +
            "voygr#list-calls.",
    ),
});
