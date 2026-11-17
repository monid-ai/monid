import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zInboxBody } from "../../../schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Release Your Inbox",
        summary:
            "Request release of an owned mailbox and stop future renewals.",
        docsUrl: "https://docs.agentmail.to/api-reference/inboxes/delete",
        categories: ["agentic-email"],
        notes: [
            "Release starts immediately and permanently deletes all mail. Rent already charged, including a prepaid next month, is not refunded.",
            "A 200 acknowledges release_requested. Deletion and final storage settlement may still be in progress; check the resource status for completion.",
        ],
    },
    endpoint: "/release-inboxes/{id}",
    request: { method: "DELETE", path: "/v0/inboxes" },
    input: { schema: { body: zInboxBody } },
    resources: {
        releases: [{
            id: "agentmail/mailbox",
            key: "$.body.inboxId",
            as: "inbox",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        // The resource lifecycle is the sole upstream teardown owner.
        start: async ({ data, utils }) => ({
            kind: "COMPLETED",
            // Legacy provider release runs return 200; the generic
            // POST /v1/resources/{resourceId}/release route returns 202.
            httpStatus: 200,
            output: {
                inboxId: utils.json.str(data.input.body ?? {}, "$.inboxId"),
                status: "release_requested",
                note:
                    "The inbox is being deleted immediately; all threads, messages and attachments are permanently lost. Track it via GET /v1/resources.",
            },
        }),
    },
});
