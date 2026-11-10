import { z } from "zod";
import { zActionResult, zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.union([
        zActionResult.shape.data,
        z.looseObject({
            "accounts": z.array(z.looseObject({
                "id": z.string(),
                "label": z.string(),
            })),
            "capUsd": z.string(),
            "note": z.string(),
        }),
    ]),
});
