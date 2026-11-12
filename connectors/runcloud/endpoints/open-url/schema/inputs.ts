import { z } from "zod";

/** `POST /run-cloud/{platform}/{sessionId}/open-url` body. The vendor
 *  refuses whitespace, control characters, a bare `%`, and the about:,
 *  data: and file: schemes. */
export const zOpenUrlBody = z.object({
    url: z.string().min(1).max(4096).regex(/^[A-Za-z][A-Za-z0-9+.-]*:\S+$/)
        .describe(
            "The URL or deep link to open, e.g. 'https://example.com' in " +
                "the browser or 'myapp://settings' in an installed app.",
        ),
}).strict();
