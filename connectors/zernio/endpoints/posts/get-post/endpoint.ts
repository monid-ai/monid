import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zPostId, zProfileId } from "../../../schema/common.ts";
import { projectPost } from "../../../schema/project-post.ts";

export const zGetPostBody = z.object({
    profileId: zProfileId,
    postId: zPostId,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Get Post",
        summary:
            "Check a post's status per network, with each public post url once published.",
        description: "Read a post created with /create-post: overall status " +
            "(scheduled, publishing, published, partial, failed) and, per " +
            "account, its status, public platformPostUrl, publish time " +
            "and the network's error message when it failed. Use it to " +
            "follow up on a scheduled post.",
        docsUrl: "https://docs.zernio.com",
        categories: ["social-publishing"],
    },
    endpoint: "/get-post",
    request: { method: "GET", path: "/api/v1/posts/{postId}" },
    input: {
        schema: { body: zGetPostBody },
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                postId: String(
                    (data.input.body as Record<string, unknown>).postId,
                ),
            },
        }),
    },
    resources: {
        uses: [{ id: "zernio/profile", key: "$.body.profileId" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: { fromResponse: projectPost },
    lifecycle: {
        start: async ({ data, utils }) => {
            const $ = utils.json;
            const body = data.input.body!;
            const res = await utils.http({
                method: "GET",
                path: "/api/v1/posts/" + body.postId,
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const tag = $.optionalStr(
                res.body,
                "$.post.metadata.monidProfileId",
            );
            if (tag !== body.profileId) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 404,
                    output: { error: "Post not found" } as Json,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
