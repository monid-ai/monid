import { z } from "zod";
import { zCategoryId } from "../common/ids.ts";
import { zBaseMeta } from "./base.ts";

/**
 * Endpoint metadata. `categories` = CLOSED vocabulary — leaf ids validated
 * fail-closed at compile against connectors/categories.ts.
 */
export const zEndpointMeta = z.strictObject({
    ...zBaseMeta.shape,
    annotations: z.object({
        readOnly: z.boolean().optional(),
        destructive: z.boolean().optional(),
        openWorld: z.boolean().optional(),
    }).strict().optional(),
    categories: z.array(zCategoryId).optional(),
});
export type EndpointMeta = z.infer<typeof zEndpointMeta>;
