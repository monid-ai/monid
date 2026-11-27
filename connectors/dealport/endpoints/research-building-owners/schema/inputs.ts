import { z } from "zod";
import { zDealportUuid } from "../../../schema/common.ts";

/**
 * `POST /api/v1/buildings/owners` JSON request body mirror
 * (https://app.dealport.com/openapi/v1.json). Optionality and OpenAPI
 * nullability only; the stateless binding in `endpoint.ts` omits `project_id`
 * and `project_name`.
 */
export const zResearchBuildingOwnersBody = z.object({
    bbls: z.array(z.string().regex(/^[1-5][0-9]{9}$/)).min(1).max(50).describe(
        "1 to 50 10-digit NYC Borough-Block-Lot identifiers (`^[1-5][0-9]{9}$`).",
    ),
    project_id: zDealportUuid.describe(
        "Optional Dealport Project UUID to attach resolved building owners to.",
    ).nullable().optional(),
    project_name: z.string().min(1).describe(
        "Optional Dealport Project name when creating or targeting a Project.",
    ).nullable().optional(),
    confirm_max_usd: z.number().min(0).describe(
        "Omit for a free ($0.00) quote; pass a USD ceiling at or above quoted `total_usd` to run owner resolution ($0.05 per distinct owner).",
    ).optional(),
}).strict();
