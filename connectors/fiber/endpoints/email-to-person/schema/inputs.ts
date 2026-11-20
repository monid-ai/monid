import { z } from "zod";

/** Body of POST /v1/email-to-person/single (reverseEmailLookup). */
export const zEmailToPersonBody = z.object({
    email: z.email().describe(
        "The email address (work or personal) of the person whose LinkedIn " +
            "profile you want to find.",
    ),
});
