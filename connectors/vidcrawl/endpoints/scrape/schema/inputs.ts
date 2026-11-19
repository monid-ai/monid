import { z } from "zod";
import { zLangCode, zScrapeFormat, zVideoUrl } from "../../../schema/common.ts";

/**
 * `POST /v1/scrape` request body matching `ScrapeRequestSchema`.
 */
export const zVidCrawlScrapeBody = z.strictObject({
    url: zVideoUrl,
    formats: z.array(zScrapeFormat)
        .min(1)
        .max(3)
        .describe(
            "Output layers to return ('markdown', 'segments', 'storyboard'). Defaults to all three.",
        )
        .optional(),
    lang: zLangCode.optional(),
    max_age_sec: z.number()
        .int()
        .min(0)
        .max(31_536_000)
        .describe(
            "Maximum cached age in seconds (0..31536000, default 2592000 = 30 days). Pass 0 to bypass cache and force a fresh live scrape.",
        )
        .optional(),
});
