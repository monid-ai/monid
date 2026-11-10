import { z } from "zod";
import { paginationFields } from "../../../schema/common.ts";
import { peopleFilterFields } from "../../../schema/people-filters.ts";

/** POST /v2/search/people body: the People filters plus cursor
 *  pagination. The gateway rejects unknown keys (`UNKNOWN_FIELD`, with a
 *  suggestion), so the mirror is strict. */
export const zSearchPeopleBody = z.object({
    ...peopleFilterFields,
    ...paginationFields,
}).strict();
