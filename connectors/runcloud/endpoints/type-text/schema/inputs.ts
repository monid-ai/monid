import { z } from "zod";

/** Interaction body for action `typeText`: US-keyboard ASCII, tab and
 *  newline only, 1-10000 characters (the vendor's own rule). */
export const zTypeTextBody = z.object({
    text: z.string().min(1).max(10_000).regex(/^[\t\n\x20-\x7e]+$/)
        .describe(
            "Text to type (1-10000 characters; printable US ASCII, tab and " +
                "newline only).",
        ),
}).strict();
