import { z } from "zod";

/** `POST /run-cloud/{platform}/{sessionId}/open-url` body, with the
 *  vendor's rules (docs.run.cloud/platform/open-urls): one absolute URI, no
 *  whitespace or control characters, well-formed percent escapes, a host on
 *  http(s), and never about:, data:, file:, javascript: or vbscript:.
 *  Custom app schemes stay allowed. */
export const zOpenUrlBody = z.object({
    url: z.string().min(1).max(4096)
        .regex(/^[A-Za-z][A-Za-z0-9+.-]*:[^\s\x00-\x1f\x7f]+$/)
        .regex(/^[^%]*(%[0-9A-Fa-f]{2}[^%]*)*$/)
        .regex(/^(?![Hh][Tt][Tt][Pp][Ss]?:(?!\/\/[^/?#\s]))/)
        .regex(
            /^(?!(?:[Aa][Bb][Oo][Uu][Tt]|[Dd][Aa][Tt][Aa]|[Ff][Ii][Ll][Ee]|[Jj][Aa][Vv][Aa][Ss][Cc][Rr][Ii][Pp][Tt]|[Vv][Bb][Ss][Cc][Rr][Ii][Pp][Tt]):)/,
        )
        .describe(
            "The URL or deep link to open, e.g. 'https://example.com' in " +
                "the browser or 'myapp://settings' in an installed app.",
        ),
}).strict();
