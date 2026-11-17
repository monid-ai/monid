import { z } from "zod";

/** `POST /v1/x/profile` request body — the faithful vendor mirror. The
 *  vendor takes `profileUrl` or `username`, not both; the binding enforces
 *  it. */
export const zXProfileBody = z.object({
    profileUrl: z.string().describe(
        "Link to the X profile, like https://x.com/nasa. Send this or " +
            "username.",
    ).optional(),
    username: z.string().describe(
        "X profile handle, like nasa. Send this or profileUrl.",
    ).optional(),
}).strict();
