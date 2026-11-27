import { z } from "zod";
import { ownerLookupShape } from "../../../schema/common.ts";

/**
 * `POST /api/v1/owners` request body mirror (`OwnerLookupRequest`,
 * https://app.dealport.com/openapi/v1.json).
 */
export const zFindOwnerBody = z.object(ownerLookupShape).strict();
