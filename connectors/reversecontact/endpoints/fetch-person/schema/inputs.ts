import { z } from "zod";
import { PERSON_REF_HINT, zPersonRef } from "../../../schema/profile-ref.ts";

/** POST /v2/fetch/persons body. The vendor takes `url`, `id`, or both
 *  (`id` wins); one of them is required, bound as a union. */
export const zFetchPersonBody = z.union([
    zPersonRef.required({ url: true }),
    zPersonRef.required({ id: true }),
]).describe(PERSON_REF_HINT);
