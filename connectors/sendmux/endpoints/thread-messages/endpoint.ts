import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zThreadId, zThreadMessagesQuery } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "List Thread Messages",
        summary: "Page through one thread’s messages.",
        description: "Page through one thread’s messages.",
        categories: ["agent-email"],
    },
    endpoint: "/thread-messages",
    request: { method: "GET", path: "/mailbox/threads/{thread_id}/messages" },
    input: {
        schema: { pathParams: zThreadId, queryParams: zThreadMessagesQuery },
    },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
