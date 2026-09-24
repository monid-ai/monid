import { z } from "zod";

/** MuAPI Nano Banana 2 image-editing request mirror. */
export const zNanoBanana2EditBody = z.strictObject({
    prompt: z.string().optional(),
    images_list: z.array(z.string()).optional(),
    aspect_ratio: z.string().optional(),
    google_search: z.boolean().optional(),
    resolution: z.string().optional(),
    output_format: z.string().optional(),
});
