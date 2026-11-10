import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "accountId": z.union([z.uuid(), z.null()]),
        "count": z.number().int().min(0).max(9007199254740991),
        "entries": z.array(z.looseObject({
            "id": z.uuid(),
            "actorType": z.string(),
            "action": z.string(),
            "resourceType": z.union([z.string(), z.null()]),
            "resourceId": z.union([z.string(), z.null()]),
            "timestamp": z.iso.datetime(),
            "correction": z.looseObject({
                "kind": z.enum(["category", "recurring", "debt"]).optional(),
                "status": z.enum(["pending", "expired", "applied", "undone"])
                    .optional(),
                "appliedMode": z.union([
                    z.enum(["selected", "matching"]),
                    z.null(),
                ]).optional(),
                "reviewUrl": z.url(),
            }).optional(),
        })),
        "page": z.record(z.string(), z.json()),
        "warning": z.string(),
    }),
});
