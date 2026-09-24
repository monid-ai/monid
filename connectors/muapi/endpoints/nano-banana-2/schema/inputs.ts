import { z } from "zod";

/** MuAPI Nano Banana 2 text-to-image request mirror. */
export const zNanoBanana2Body = z.strictObject({
    prompt: z.string().optional(),
    aspect_ratio: z.string().optional(),
    google_search: z.boolean().optional(),
    resolution: z.string().optional(),
    output_format: z.string().optional(),
});
