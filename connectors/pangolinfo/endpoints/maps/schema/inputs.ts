import { z } from "zod";

export const zBody = z.strictObject({
    q: z.string().min(1).describe(
        "Local-business query, for example coffee shop.",
    ),
    ll: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,\d+\.?\d*z?$/).describe(
        "Latitude,longitude,zoom, for example 37.7822,-122.4642,13z.",
    ),
    hl: z.string().min(1).optional(),
    start: z.number().int().min(0).optional(),
    num: z.number().int().min(1).max(100).optional(),
    timeout: z.number().int().min(1).max(240000).optional(),
});
