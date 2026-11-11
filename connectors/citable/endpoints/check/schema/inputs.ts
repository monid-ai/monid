import { z } from "zod";

/** GET /api/check query — the vendor mirror (github.com/flisk-sh/citable
 *  README "API", 2026-11-11). `url` is required upstream; a missing one
 *  answers 400 `{"error": "Give ?url=, for example ?url=example.com"}`. */
export const zCheckQueryParams = z.object({
    url: z.string().min(1).describe(
        "The page to check, for example 'example.com' or " +
            "'https://example.com/pricing'. Only public addresses on ports " +
            "80 and 443 are fetched.",
    ),
    fresh: z.enum(["1"]).describe(
        "Pass '1' to check again instead of returning the report cached " +
            "for the last hour.",
    ).optional(),
}).strict();
