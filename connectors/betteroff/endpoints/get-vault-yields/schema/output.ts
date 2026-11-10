import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "venues": z.array(z.enum(["upshift", "morpho", "ethena"])),
        "vaults": z.array(z.looseObject({
            "venue": z.enum(["upshift", "morpho", "ethena"]),
            "name": z.string(),
            "address": z.string(),
            "chainId": z.number().int().min(-9007199254740991).max(
                9007199254740991,
            ),
            "asset": z.union([z.string(), z.null()]),
            "apyPercent": z.union([z.number(), z.null()]),
            "apyBasis": z.string(),
            "totalAssetsUsd": z.union([z.number(), z.null()]),
            "source": z.url(),
            "asOf": z.string(),
        })),
        "omitted": z.number().int().min(0).max(9007199254740991),
        "unavailable": z.array(z.enum(["upshift", "morpho", "ethena"])),
        "stale": z.array(z.enum(["upshift", "morpho", "ethena"])),
        "note": z.string(),
    }),
});
