import { z } from "zod";
import { paginationFields, zPrompt } from "../../../schema/common.ts";

/** POST /v2/search/people/prompt body: a prompt and the pagination, never
 *  filters (422 `PROMPT_FILTERS_NOT_SUPPORTED`). */
export const zSearchPeoplePromptBody = z.object({
    prompt: zPrompt,
    ...paginationFields,
}).strict();
