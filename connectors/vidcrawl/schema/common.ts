import { z } from "zod";

/**
 * Shared VidCrawl input primitives matching `@vidcrawl/contracts`.
 */
export const zVideoUrl = z.url({ protocol: /^https?$/ })
    .regex(/^https?:\/\//i)
    .describe(
        "Public HTTP(S) video URL (YouTube, TikTok, Instagram Reels, or X/Twitter).",
    );

export const zLangCode = z.string()
    .min(2)
    .max(16)
    .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
    .describe(
        "Preferred BCP-47 transcript language code (e.g. 'en', 'zh-Hans'). Defaults to 'en'.",
    );

export const zScrapeFormat = z.enum([
    "markdown",
    "segments",
    "storyboard",
]);
