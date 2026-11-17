import { z } from "zod";
import { zIngredient, zTargetUnits } from "../../../schema/common.ts";

export const zShoppingMergeBody = z.object({
    ingredients: z.array(zIngredient).min(1).max(500),
    targetUnits: zTargetUnits.optional(),
}).strict();
