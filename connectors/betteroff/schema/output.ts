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
    revision: z.number().int().nonnegative().optional(),
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

// The original three endpoints also accept pre-revision v4 results. New tools
// require both published revision fields. No coercion or money rounding.
export const zCurrentResult = zReadResult.extend({
    revision: z.number().int().nonnegative(),
});

export const zCorrectionResult = zCurrentResult.extend({
    data: z.looseObject({
        "id": z.uuid(),
        "kind": z.enum(["category", "recurring", "debt"]),
        "status": z.string(),
        "expiresAt": z.iso.datetime(),
        "selectedCount": z.number().int().min(0).max(9007199254740991),
        "matchingCount": z.number().int().min(0).max(9007199254740991),
        "canSaveRule": z.boolean(),
        "input": z.record(z.string(), z.json()),
        "preview": z.record(z.string(), z.json()),
        "reviewUrl": z.url(),
        "note": z.string(),
    }),
});

export const zActionResult = zCurrentResult.extend({
    data: z.looseObject({
        "id": z.uuid(),
        "kind": z.enum(["transfer", "bank_transfer", "vault_deposit"]),
        "surface": z.enum(["app", "mcp", "imessage"]),
        "terms": z.record(z.string(), z.json()),
        "termsDigest": z.string(),
        "status": z.string(),
        "createdAt": z.iso.datetime(),
        "expiresAt": z.iso.datetime(),
        "reviewUrl": z.url(),
        "note": z.string(),
    }),
});
