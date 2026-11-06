import { z } from "zod";
import { zFiles, zText } from "../../trace/schema/inputs.ts";

/** `POST /v1/understand` body: the situation in words, optional files. */
export const zUnderstandBody = z.object({
    text: zText,
    files: zFiles.optional(),
});
