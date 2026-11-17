import { z } from "zod";
import { zFields, zOmit, zUserId } from "../../../schema/common.ts";

/** `GET /x/users/{id}` path, mirrored from https://xquik.com/openapi.yaml
 *  (`getUser`, 2026-11-14). */
export const zUserPathParams = z.object({ id: zUserId });

/** `GET /x/users/{id}` query. */
export const zUserQueryParams = z.object({
    fields: zFields.optional(),
    omit: zOmit.optional(),
}).strict();
