import { z } from "zod";
import { zWebsite } from "../../../schema/common.ts";

export const zBody = zWebsite.extend({
    isInvisible: z.boolean().optional().describe(
        "Whether the page uses an invisible reCAPTCHA v2 widget.",
    ),
    pageAction: z.string().min(1).optional().describe(
        "The sa value from the reCAPTCHA anchor request, when present.",
    ),
    recaptchaDataSValue: z.string().optional().describe(
        "The s value from the standard reCAPTCHA v2 anchor request, when present.",
    ),
    isSession: z.boolean().optional().describe(
        "Enable CapSolver session mode and preserve returned session fields.",
    ),
    apiDomain: z.string().optional().describe(
        "The domain used to load reCAPTCHA; omit to use the provider default.",
    ),
}).strict();
