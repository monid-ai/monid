import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "Release Inbox",
        summary: "Stop using an owned inbox and request its release.",
        description: "Request release of an inbox owned by this workspace.",
        categories: ["agent-email"],
    },
    endpoint: "/release-mailbox",
    request: { method: "DELETE", path: "/mailboxes/{public_id}" },
    input: {
        schema: { body: z.strictObject({ public_id: z.string().min(1) }) },
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                public_id: String(
                    (data.input.body as Record<string, unknown>).public_id,
                ),
            },
        }),
    },
    resources: {
        releases: [{ id: "sendmux/mailbox", key: "$.body.public_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data }) => ({
            kind: "COMPLETED",
            httpStatus: 202,
            output: {
                id: (data.input.body as Record<string, unknown>)
                    .public_id as string,
                status: "release_requested",
            },
        }),
    },
});
