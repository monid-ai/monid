import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zConnectPlatform, zProfileId } from "../../../schema/common.ts";

export const zConnectAccountBody = z.object({
    profileId: zProfileId,
    platform: zConnectPlatform.describe(
        "The social network to connect. 'twitter' is X.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Connect Social Account",
        summary:
            "Get a 30-minute link the account owner opens to connect a social account to your profile.",
        description:
            "Start connecting a social account (X, Instagram, TikTok, " +
            "LinkedIn, YouTube, Facebook, Threads, Pinterest, Bluesky, " +
            "Google Business, Telegram, Reddit) to a profile you own. " +
            "Returns 'url', a link valid for 30 minutes: send it to the " +
            "person who owns the social account (or show it as a QR " +
            "code). They log in to the network there; no Zernio signup. " +
            "Then poll /connect-status with the returned handoffId every " +
            "few seconds until it reports 'connected', 'failed' or " +
            "'expired'. An agent cannot complete this step alone.",
        docsUrl: "https://docs.zernio.com",
        categories: ["social-publishing"],
        notes: [
            "Connecting the same account again refreshes it and keeps " +
            "its history; a profile can hold several accounts of one " +
            "network.",
        ],
    },
    endpoint: "/connect-account",
    request: { method: "GET", path: "/api/v1/connect/{platform}" },
    input: {
        schema: { body: zConnectAccountBody },
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                platform: String(
                    (data.input.body as Record<string, unknown>).platform,
                ),
            },
        }),
    },
    resources: {
        uses: [{ id: "zernio/profile", key: "$.body.profileId" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data, utils }) => {
            const $ = utils.json;
            const body = data.input.body!;
            const res = await utils.http({
                method: "GET",
                path: "/api/v1/connect/" + body.platform,
                queryParams: { profileId: body.profileId, handoff: "true" },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const accountId = $.optionalStr(res.body, "$.account._id");
            if (accountId !== undefined) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: {
                        status: "connected",
                        platform: body.platform,
                        accounts: [{ accountId }],
                    } as Json,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: {
                    status: "waiting",
                    platform: body.platform,
                    handoffId: $.optionalGet(res.body, "$.handoff.id") ?? null,
                    url: $.optionalGet(res.body, "$.handoff.url") ?? null,
                    expiresAt: $.optionalGet(res.body, "$.handoff.expiresAt") ??
                        null,
                    next: "Send url to the account owner, then poll " +
                        "/connect-status with handoffId and profileId.",
                } as Json,
            };
        },
    },
});
