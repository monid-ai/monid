import { defineProvider, presets } from "@shared/core";

/**
 * Zernio (https://zernio.com) — publish and schedule posts to 12 social
 * networks through one API. Authored by the Zernio team against the
 * public OpenAPI spec (https://zernio.com/openapi.yaml).
 *
 * Bearer-key REST on `https://zernio.com/api/v1` (the prefix rides on every
 * path: `utils.http` resolves paths against the origin). The key belongs to ONE
 * pooled Monid account, so the ownership machinery carries the tenancy:
 *
 *   - THE PROFILE IS THE OWNED RESOURCE (`zernio/profile`). Every social
 *     account a workspace connects lands in a profile that workspace
 *     created, and every account- or post-scoped endpoint USES a profile,
 *     so a foreign profile id is the uniform pre-gate 404.
 *   - ACCOUNTS AND POSTS ARE CHECKED AGAINST THE GATED PROFILE. A profile
 *     gate alone would let a workspace name another tenant's accountId or
 *     postId, so those endpoints read the profile's accounts first and
 *     refuse (404, zero usage) anything outside it.
 *   - NO POOLED LIST IS EVER RELAYED. Account lists are filtered upstream
 *     by `profileId`; the profile list is served from the ownership window.
 *   - THE MONID ACCOUNT'S OWN USER ID never reaches users (`userId` is
 *     stripped on success AND error surfaces).
 *
 * Social accounts are connected by a HUMAN: /connect-account returns a
 * 30-minute handoff link the agent forwards (or shows as a QR code), and
 * /connect-status reports when the accounts landed on the profile.
 */
export default defineProvider({
    name: "zernio",
    meta: {
        displayName: "Zernio",
        summary:
            "Publish and schedule posts to X, Instagram, TikTok, LinkedIn, YouTube and 7 more networks.",
        description: "Zernio is the social media API for agents: create a " +
            "profile, send its owner a link to connect their social " +
            "accounts, then publish or schedule posts (text, images, " +
            "video, carousels) to X/Twitter, Instagram, Facebook, " +
            "LinkedIn, TikTok, YouTube, Threads, Pinterest, Bluesky, " +
            "Google Business, Telegram and Reddit in one call. Use it to " +
            "POST content, not to read other people's content.",
        homepageUrl: "https://zernio.com",
        docsUrl: "https://docs.zernio.com",
        categories: ["social-publishing"],
        notes: [
            "Profiles are OWNED RESOURCES: account- and post-scoped " +
            "endpoints only operate on profiles this workspace created; a " +
            "foreign or unknown id is a uniform 404.",
            "Connecting a social account needs its owner: forward the " +
            "handoff link from /connect-account to them, then poll " +
            "/connect-status.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://zernio.com",
        headers: { Accept: "application/json" },
    },
    timeouts: { requestMs: 30_000, runMs: 60_000 },
    usage: { credits: { default: { label: "US dollars" } } },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["userId"]),
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalStr(data.output, "$.error");
            return {
                message: message !== undefined && message !== ""
                    ? message
                    : "Zernio API error",
                raw: utils.json.omit(data.output, ["userId"]),
            };
        },
    },
});
