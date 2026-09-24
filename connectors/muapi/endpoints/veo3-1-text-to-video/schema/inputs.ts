import { z } from "zod";

/** MuAPI Veo 3.1 text-to-video request mirror. */
export const zVeo31TextToVideoBody = z.strictObject({
    prompt: z.string().optional(),
    aspect_ratio: z.string().optional(),
    duration: z.number().optional(),
    resolution: z.string().optional(),
});
