import { z } from "zod";
import { zPersonId, zPersonUrl } from "../../../schema/common.ts";

/** POST /v2/fetch/persons body. The vendor takes `url`, `id`, or both
 *  (`id` wins); one of them is required, bound as a union. */
const zFetchPersonFields = z.object({
    url: zPersonUrl.optional(),
    id: zPersonId.optional(),
}).strict();

export const zFetchPersonBody = z.union([
    zFetchPersonFields.required({ url: true }),
    zFetchPersonFields.required({ id: true }),
]).describe(
    "Identify the person by `url` or by `id` (`id` wins when both are " +
        "given).",
);
