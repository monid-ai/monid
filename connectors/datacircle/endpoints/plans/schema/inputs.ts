import { z } from "zod";

/** GET /plans (api.datacircle.dev/v1/openapi.json, 2026-11-09). */
export const zPlansQueryParams = z.object({
    api: z.string().min(1).optional().describe(
        "The API, its name or its slug as the list endpoint gives them. Every API when left out.",
    ),
    query: z.string().min(1).optional().describe(
        "Words that must all appear in the provider's or plan's name, ignoring case and accents.",
    ),
    sort: z.enum(["score", "provider", "price"]).optional().describe(
        "score, the default: best first, as on the sheet at datacircle.dev. provider: A to Z. price: $ per 1,000, lowest first.",
    ),
    limit: z.number().int().min(1).max(50).optional().describe(
        "How many plans to give, 1 to 50. 10 when left out.",
    ),
    offset: z.number().int().min(0).optional().describe(
        "How many found plans to skip first. 0 when left out.",
    ),
}).strict();
