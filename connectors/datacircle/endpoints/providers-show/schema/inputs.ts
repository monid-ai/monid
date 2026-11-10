import { z } from "zod";

/** GET /providers/{slug} (api.datacircle.dev/v1/openapi.json, 2026-11-09). */
export const zProviderPathParams = z.object({
    slug: z.string().min(1).describe(
        "The provider's slug as the plans endpoint gives it. Example: bridgly.",
    ),
}).strict();
