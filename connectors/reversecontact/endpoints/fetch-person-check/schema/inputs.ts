import { z } from "zod";
import { PERSON_REF_HINT, zPersonRef } from "../../../schema/profile-ref.ts";

/** POST /v2/fetch/persons/check body: the body of `POST /v2/fetch/persons`
 *  (`url`, `id`, or both; `id` wins), one of them required. */
export const zCheckPersonBody = z.union([
    zPersonRef.required({ url: true }),
    zPersonRef.required({ id: true }),
]).describe(PERSON_REF_HINT);
