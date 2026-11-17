import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google-ads/ads` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google-ads/ads). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGoogleAdsAdsBody = z.object({
    domains: z.array(z.string())
        .describe(
            "Advertiser websites to find ads for, one per line, e.g. nike.com. A bare host or a full URL both work; returns the ads Google shows that send people to that site.",
        )
        .optional(),
    advertisers: z.array(z.string())
        .describe(
            "Advertiser names (HubSpot) or Google advertiser IDs (AR13611357312189988865), one per line. A name matches up to 3 advertiser accounts, which share that name's share of Max Results. Not a link: use Domains for a website.",
        )
        .optional(),
    country: z.string()
        .describe(
            "Only ads shown in this country. Any country by default. Accepts one of 240 values; list them with GET https://api.mindcase.co/v1/data/google-ads/ads?expand=options.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many ads to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
