import { z } from "zod";

/** `GET /user/users/by/ids` query parameters — vendor mirror (D25). The
 *  vendor takes ONE comma-separated value (`explode: false`); the provider's
 *  `input.toRequest` joins the array. */
export const zUsersByIdsQueryParams = z.object({
    ids: z.array(z.string().regex(/^[0-9]{1,30}$/)).min(1).max(100)
        .describe("Numeric user IDs, at most 100."),
}).strict();
