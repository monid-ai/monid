import { z } from "zod";
import { zFields, zOmit } from "../../../schema/common.ts";

/** `GET /x/tweets/{id}` path, mirrored from https://xquik.com/openapi.yaml
 *  (`lookupTweet`, 2026-11-14). */
export const zTweetPathParams = z.object({
    id: z.string().min(1).max(2048).describe(
        "Tweet ID or tweet URL, such as x.com/nasa/status/20.",
    ),
});

/** `GET /x/tweets/{id}` query. */
export const zTweetQueryParams = z.object({
    fields: zFields.optional(),
    omit: zOmit.optional(),
}).strict();
