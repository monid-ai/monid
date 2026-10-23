import { z } from "zod";

/** POST /v1/logins/username body. */
export const zLoginUsernameBody = z.object({
    label: z.string().min(1).describe(
        "Label of the agent-created login, as returned in its catalog entry.",
    ),
    username: z.string().min(4).describe(
        "Username the site accepted, at least 4 characters with no control characters.",
    ),
});
