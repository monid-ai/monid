import { z } from "zod";

/** `{id}` of the recipe submission. */
export const zSubmissionPathParams = z.object({
    id: z.string().min(1).describe(
        "Submission id returned by POST /v1/recipes.",
    ),
});
