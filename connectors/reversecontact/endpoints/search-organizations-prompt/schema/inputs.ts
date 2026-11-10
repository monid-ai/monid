import { z } from "zod";
import { paginationFields, zPrompt } from "../../../schema/common.ts";

/** POST /v2/search/organizations/prompt body: a prompt and the pagination,
 *  never filters. */
export const zSearchOrganizationsPromptBody = z.object({
    prompt: zPrompt,
    ...paginationFields,
}).strict();
