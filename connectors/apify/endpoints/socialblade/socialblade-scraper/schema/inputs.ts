import { z } from "zod";

/**
 * benthepythondev/socialblade-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/benthepythondev~socialblade-scraper/builds/default →
 * actorDefinition.input) on 2026-10-26 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zSocialbladeScraperBody = z.object({
    profileUrls: z.array(z.object({ url: z.string() }))
        .describe(
            "Creator profile URLs from SocialBlade, YouTube, TikTok, Instagram or Twitch, for example https://www.youtube.com/@mkbhd or https://socialblade.com/tiktok/user/khaby.lame.",
        ).optional(),
    maxProfiles: z.number().int().min(1).max(100).describe(
        "Maximum number of supplied SocialBlade profiles processed in one run.",
    ).optional(),
    trackHistory: z.boolean().describe(
        "Saves each profile's daily history in the key-value store 'socialblade-history' of your account and adds it to the 15 days SocialBlade shows, so a weekly schedule builds a history of months and years. The 30- and 90-day gains fill in once the kept history reaches that far.",
    ).optional(),
});
