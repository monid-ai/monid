import { z } from "zod";
import { zIngredient } from "../../../schema/common.ts";

export const zRecipeScaleBody = z.object({
    fromServings: z.string().min(1).max(64),
    toServings: z.string().min(1).max(64),
    ingredients: z.array(zIngredient).min(1).max(200),
    instructions: z.string().max(20_000).optional(),
}).strict();
