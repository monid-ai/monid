import { z } from "zod";
import {
    paginationFields,
    zPersonId,
    zPersonUrl,
} from "../../../schema/common.ts";

/** POST /v2/search/people/lookalike body: EXACTLY one seed (`url` or `id`;
 *  both answer 422) and the pagination, never filters. Two strict arms,
 *  each without the other seed key, so a body carrying both fails both. */
export const zLookalikeByUrl = z.object({
    url: zPersonUrl,
    ...paginationFields,
}).strict();

export const zLookalikeById = z.object({
    id: zPersonId,
    ...paginationFields,
}).strict();
