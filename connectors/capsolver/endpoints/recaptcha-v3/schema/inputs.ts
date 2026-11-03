import { z } from "zod";
import { zWebsite } from "../../../schema/common.ts";

export const zBody = zWebsite.extend({
    pageAction: z.string().min(1).optional().describe(
        "The action passed to grecaptcha.execute on the target page.",
    ),
    isSession: z.boolean().optional().describe(
        "Enable CapSolver session mode and preserve returned session fields.",
    ),
    apiDomain: z.string().optional().describe(
        "The domain used to load reCAPTCHA; omit to use the provider default.",
    ),
}).strict();
