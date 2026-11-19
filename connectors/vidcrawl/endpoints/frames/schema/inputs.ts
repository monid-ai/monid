import { z } from "zod";
import { zVideoUrl } from "../../../schema/common.ts";

/**
 * `POST /v1/frames` request body matching `FramesRequestSchema`.
 */
export const zVidCrawlFramesBody = z.strictObject({
    url: zVideoUrl,
    timestamps_sec: z.array(z.number().nonnegative())
        .min(1)
        .max(20)
        .describe(
            "Target timestamps in seconds (1 to 20 items, >= 0) to extract sharp JPEG frames.",
        ),
    max_width: z.number()
        .int()
        .min(320)
        .max(1920)
        .describe(
            "Maximum frame width in pixels (320..1920). Defaults to 1280.",
        )
        .optional(),
});
