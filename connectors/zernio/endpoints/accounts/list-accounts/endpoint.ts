import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zProfileId } from "../../../schema/common.ts";

export const zListAccountsBody = z.object({
    profileId: zProfileId,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "List Connected Accounts",
        summary:
            "List the social accounts connected to a profile you own, with their accountId and health.",
        description:
            "List the social accounts connected to one of YOUR profiles: " +
            "accountId (what /create-post targets), platform, username, " +
            "display name, profile url and whether the account is active. " +
            "An inactive account needs its owner to reconnect it through " +
            "/connect-account.",
        docsUrl: "https://docs.zernio.com",
        categories: ["social-publishing"],
    },
    endpoint: "/list-accounts",
    request: { method: "GET", path: "/api/v1/accounts" },
    input: { schema: { body: zListAccountsBody } },
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
                path: "/api/v1/accounts",
                queryParams: { profileId: body.profileId },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const listed = $.optionalGet(res.body, "$.accounts");
            const items = (Array.isArray(listed) ? listed : []).map((
                account,
            ) => ({
                accountId: $.optionalGet(account, "$._id") ?? null,
                platform: $.optionalGet(account, "$.platform") ?? null,
                username: $.optionalGet(account, "$.username") ?? null,
                displayName: $.optionalGet(account, "$.displayName") ?? null,
                profileUrl: $.optionalGet(account, "$.profileUrl") ?? null,
                isActive: $.optionalGet(account, "$.isActive") ?? null,
            }));
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: items as Json,
            };
        },
    },
});
