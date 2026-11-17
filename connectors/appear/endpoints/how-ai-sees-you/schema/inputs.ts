import { z } from "zod";

export const scanBody = z.object({
    domain: z.string().min(1).describe(
        "Public domain or HTTP(S) URL to scan. A URL selects its hostname.",
    ),
    fresh: z.boolean().optional().describe(
        "Set to true to run a new scan even when a cached report is available.",
    ),
});
