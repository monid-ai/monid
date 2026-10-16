import { z } from "zod";

// Match BetterOff's v4 contract without stripping fields added by the provider.
export const zMoney = z.union([
    z.number(),
    z.string().regex(/^-?\d+(\.\d+)?$/),
]);

export const zReadResult = z.looseObject({
    ok: z.literal(true),
    schemaVersion: z.literal("4"),
    requestId: z.string().optional(),
    currency: z.string().nullable(),
    timezone: z.string(),
    asOf: z.string().nullable(),
    householdRevision: z.number().int().nonnegative(),
    quality: z.looseObject({
        state: z.enum(["complete", "partial", "unavailable"]),
        reasons: z.array(z.string()),
    }),
    evidence: z.array(
        z.looseObject({
            source: z.string(),
            id: z.string().optional(),
            observedAt: z.string().nullable(),
        }),
    ),
    page: z.looseObject({
        returnedCount: z.number().int().nonnegative(),
        totalCount: z.number().int().nonnegative().nullable(),
        truncated: z.boolean(),
        nextCursor: z.json().nullable(),
    }),
    warnings: z.array(z.string()),
    notes: z.string().optional(),
});
