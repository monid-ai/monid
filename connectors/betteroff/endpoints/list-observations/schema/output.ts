import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "items": z.array(z.looseObject({
            "id": z.uuid(),
            "source": z.string(),
            "headline": z.string(),
            "detail": z.string(),
            "status": z.string(),
            "statusReason": z.union([z.string(), z.null()]),
            "method": z.string(),
            "timesSeen": z.number().int().min(-9007199254740991).max(
                9007199254740991,
            ),
            "firstSeenAt": z.iso.datetime(),
            "lastSeenAt": z.iso.datetime(),
            "dismissedAt": z.union([z.iso.datetime(), z.null()]),
            "resolvedAt": z.union([z.iso.datetime(), z.null()]),
            "evidence": z.array(z.looseObject({
                "id": z.string().optional(),
                "label": z.string(),
                "observedAt": z.string(),
            })),
        })),
        "page": z.record(z.string(), z.json()),
        "warnings": z.array(z.string()),
    }),
});
