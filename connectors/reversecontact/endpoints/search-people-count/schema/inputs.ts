import { z } from "zod";
import { peopleFilterFields } from "../../../schema/people-filters.ts";

/** POST /v2/search/people/count body: exactly the People filters, without
 *  pagination. */
export const zSearchPeopleCountBody = z.object(peopleFilterFields).strict();
