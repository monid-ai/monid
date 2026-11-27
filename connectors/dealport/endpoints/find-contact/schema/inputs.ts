import { z } from "zod";
import { ownerLookupShape } from "../../../schema/common.ts";

/**
 * `POST /api/v1/contacts` request body mirror (`OwnerLookupRequest`,
 * https://app.dealport.com/openapi/v1.json).
 */
export const zFindContactBody = z.object(ownerLookupShape).strict();
