import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zProfileId } from "../../../schema/common.ts";

export const zConnectStatusBody = z.object({
    profileId: zProfileId,
    handoffId: z.string().uuid().describe(
        "The handoffId returned by /connect-account.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Connect Status",
        summary:
            "Check whether the account owner finished connecting: waiting, opened, connected, failed or expired.",
        description:
            "Poll the connect started by /connect-account (every 2 to 5 " +
            "seconds is fine). 'connected' carries the new accounts, " +
            "each with the accountId /create-post needs; 'failed' carries " +
            "the error (e.g. the owner declined a permission, or an " +
            "Instagram account is not a professional account); 'expired' " +
            "means nobody opened the link within 30 minutes, so call " +
            "/connect-account again. Readable for 60 minutes.",
        docsUrl: "https://docs.zernio.com",
        categories: ["social-publishing"],
    },
    endpoint: "/connect-status",
    request: { method: "GET", path: "/api/v1/connect/handoffs/{handoffId}" },
    input: {
        schema: { body: zConnectStatusBody },
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                handoffId: String(
                    (data.input.body as Record<string, unknown>).handoffId,
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
                path: "/api/v1/connect/handoffs/" + body.handoffId,
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const listed = $.optionalGet(res.body, "$.accounts");
            const accounts = Array.isArray(listed) ? listed : [];
            const foreign = accounts.some((account) =>
                $.optionalStr(account, "$.profileId") !== body.profileId
            );
            if (foreign) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 404,
                    output: { error: "Handoff not found" } as Json,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: {
                    status: $.optionalGet(res.body, "$.status") ?? null,
                    platform: $.optionalGet(res.body, "$.platform") ?? null,
                    accounts: accounts.map((account) => ({
                        accountId: $.optionalGet(account, "$.id") ?? null,
                        username: $.optionalGet(account, "$.username") ??
                            null,
                    })),
                    error: $.optionalGet(res.body, "$.error") ?? null,
                } as Json,
            };
        },
    },
});
