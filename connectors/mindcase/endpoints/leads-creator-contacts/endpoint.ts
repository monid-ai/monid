import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLeadsCreatorContactsBody } from "./schema/inputs.ts";

/**
 * Mindcase `leads/creator-contacts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Creator Contact Details",
        summary: "Creator profiles from YouTube, Instagram and TikTok with " +
            "handle, display name, bio, verified flag and contact " +
            "details. Pass the profile URLs.",
        description:
            "Creator profiles from YouTube, Instagram and TikTok with " +
            "handle, display name, bio, verified flag and contact " +
            "details. Pass the profile URLs. Returns one row per creator " +
            "with profileUrl, platform, handle, platformId, displayName, " +
            "bio, verified, followers, businessAccount, businessCategory, " +
            "country, email, emailSource, emailStatus, phone, websiteUrl, " +
            "youtubeUrl, instagramUrl, tiktokUrl, twitterXUrl, " +
            "facebookUrl, linkedinUrl, otherLinks. For full Instagram " +
            "account data use mindcase#instagram/profiles; for TikTok " +
            "creator stats use mindcase#tiktok/profiles; for YouTube " +
            "channel stats use mindcase#youtube/channels. $0.005 per " +
            "creator; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/leads/creator-contacts",
        categories: ["people-enrichment"],
    },
    endpoint: "/leads/creator-contacts",
    request: { method: "POST", path: "/v1/data/leads/creator-contacts/run" },
    input: {
        schema: {
            body: zLeadsCreatorContactsBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.profileUrls.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
