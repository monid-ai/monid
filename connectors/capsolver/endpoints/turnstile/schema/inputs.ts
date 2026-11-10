import { z } from "zod";
import { zWebsite } from "../../../schema/common.ts";

export const zBody = zWebsite.extend({
    action: z.string().min(1).optional().describe(
        "The widget's data-action value; forwarded as metadata.action.",
    ),
    cdata: z.string().min(1).optional().describe(
        "The widget's data-cdata value; forwarded as metadata.cdata.",
    ),
}).strict();
