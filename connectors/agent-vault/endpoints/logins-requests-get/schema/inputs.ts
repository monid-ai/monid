import { z } from "zod";

/** `{id}` of the login request. */
export const zLoginRequestPathParams = z.object({
    id: z.string().min(1).describe(
        "`requestId` returned by POST /v1/logins/requests.",
    ),
});
