import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `leads/creator-contacts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/leads/creator-contacts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLeadsCreatorContactsBody = z.object({
    profileUrls: z.array(z.string())
        .describe(
            "YouTube channel, Instagram profile or TikTok profile URLs, for example https://www.youtube.com/@mkbhd, https://www.instagram.com/natgeo or https://www.tiktok.com/@zachking. Websites and other platforms are not supported. One request reads them all.",
        ),
}).strict();
