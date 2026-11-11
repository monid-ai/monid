import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zAccountId, zMediaItem, zProfileId } from "../../../schema/common.ts";
import { projectPost } from "../../../schema/project-post.ts";

export const zCreatePostBody = z.object({
    profileId: zProfileId,
    content: z.string().optional().describe(
        "The post text. Optional when media is attached.",
    ),
    mediaItems: z.array(zMediaItem).max(20).optional().describe(
        "Images, videos or documents attached on every target. Several " +
            "images make a carousel where the network supports it.",
    ),
    platforms: z.array(
        z.object({
            accountId: zAccountId,
            customContent: z.string().optional().describe(
                "Text for this account only, replacing 'content' (e.g. a " +
                    "shorter version for X).",
            ),
            customMedia: z.array(zMediaItem).max(20).optional().describe(
                "Media for this account only, replacing 'mediaItems'.",
            ),
            platformSpecificData: z.record(z.string(), z.unknown())
                .optional().describe(
                    "Network options, e.g. YouTube 'title' and " +
                        "'visibility', TikTok 'privacy_level', Instagram " +
                        "'contentType' ('reels', 'story'), X 'threadItems'. " +
                        "See https://docs.zernio.com.",
                ),
        }).strict(),
    ).min(1).max(20).describe(
        "The accounts to publish to, from /list-accounts. One post can " +
            "go to several networks at once.",
    ),
    scheduledFor: z.string().optional().describe(
        "ISO 8601 time to publish at (e.g. '2026-12-01T10:00:00Z'). Omit " +
            "to publish right away.",
    ),
    timezone: z.string().optional().describe(
        "IANA timezone for a scheduledFor without an offset. Defaults to " +
            "the profile's timezone.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Create Post",
        summary:
            "Publish now or schedule a post to one or more connected social accounts in one call.",
        description:
            "Publish or schedule a post (text, images, video, carousel) to " +
            "accounts connected to one of YOUR profiles: X/Twitter, " +
            "Instagram, Facebook, LinkedIn, TikTok, YouTube, Threads, " +
            "Pinterest, Bluesky, Google Business, Telegram, Reddit. " +
            "Without scheduledFor it publishes immediately and returns " +
            "each network's result with its public platformPostUrl; with " +
            "scheduledFor it returns the scheduled post, and /get-post " +
            "reports the outcome later. Zernio adapts media to each " +
            "network's limits.",
        docsUrl: "https://docs.zernio.com",
        categories: ["social-publishing"],
        notes: [
            "Running this SPENDS MONEY: one flat charge per post, " +
            "however many accounts it targets.",
            "Media must be public HTTPS urls; upload local files with " +
            "/upload-media first.",
        ],
    },
    endpoint: "/create-post",
    request: { method: "POST", path: "/api/v1/posts" },
    input: { schema: { body: zCreatePostBody } },
    resources: {
        uses: [{ id: "zernio/profile", key: "$.body.profileId" }],
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "post",
            consumes: { credit: "default", amount: 0.01 },
        },
    },
    output: { fromResponse: projectPost },
    lifecycle: {
        /**
         * Every target account must belong to the gated profile, or a
         * workspace could publish through another tenant's accounts in the
         * pooled Monid account. The account list also supplies each
         * target's `platform`, so callers only name accountIds.
         * `metadata.monidProfileId` is the tag /get-post checks.
         */
        start: async ({ data, utils }) => {
            const $ = utils.json;
            const body = data.input.body!;
            const listed = await utils.http({
                method: "GET",
                path: "/api/v1/accounts",
                queryParams: { profileId: body.profileId },
            });
            if (listed.status < 200 || listed.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: listed.status,
                    output: listed.body,
                };
            }
            const rows = $.optionalGet(listed.body, "$.accounts");
            const owned = (Array.isArray(rows) ? rows : []).map((row) => ({
                id: $.optionalStr(row, "$._id"),
                platform: $.optionalStr(row, "$.platform"),
            }));
            const platformOf = (accountId: string) =>
                owned.find((row) => row.id === accountId)?.platform;
            const unknown = body.platforms.find((target) =>
                platformOf(target.accountId) === undefined
            );
            if (unknown !== undefined) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 404,
                    output: {
                        error: "Account " + unknown.accountId +
                            " is not connected to this profile",
                        param: "platforms",
                    } as Json,
                };
            }
            const res = await utils.http({
                method: "POST",
                path: "/api/v1/posts",
                headers: { "Idempotency-Key": data.run.runId + ":post" },
                body: {
                    ...(body.content !== undefined
                        ? { content: body.content }
                        : {}),
                    ...(body.mediaItems !== undefined
                        ? { mediaItems: body.mediaItems }
                        : {}),
                    platforms: body.platforms.map((target) => ({
                        ...target,
                        platform: platformOf(target.accountId),
                    })),
                    ...(body.scheduledFor !== undefined
                        ? { scheduledFor: body.scheduledFor }
                        : { publishNow: true }),
                    ...(body.timezone !== undefined
                        ? { timezone: body.timezone }
                        : {}),
                    metadata: { monidProfileId: body.profileId },
                } as Json,
            });
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
