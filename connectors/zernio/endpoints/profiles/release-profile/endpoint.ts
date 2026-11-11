import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zProfileId } from "../../../schema/common.ts";

export const zReleaseProfileBody = z.object({
    profileId: zProfileId,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Release Profile",
        summary: "Disconnect every social account of a profile and delete it.",
        description: "Release a profile you own: its social accounts are " +
            "disconnected (scheduled posts on them stop) and the profile " +
            "is deleted. Use it when you no longer publish for that brand.",
        docsUrl: "https://docs.zernio.com",
        categories: ["social-publishing"],
    },
    endpoint: "/release-profile",
    request: { method: "DELETE", path: "/api/v1/profiles/{id}" },
    input: {
        schema: { body: zReleaseProfileBody },
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                id: String(
                    (data.input.body as Record<string, unknown>).profileId,
                ),
            },
        }),
    },
    resources: {
        releases: [{ id: "zernio/profile", key: "$.body.profileId" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        /** The disconnect + delete is the resource doc's `release`, run by
         *  the host off the settle mark. */
        start: async ({ data }) => ({
            kind: "COMPLETED",
            httpStatus: 202,
            output: {
                profileId: (data.input.body as Record<string, unknown>)
                    .profileId as string,
                status: "release_requested",
            },
        }),
    },
});
