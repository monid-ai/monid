import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMailboxSelection, zThreadId } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get Thread",
        summary: "Read one thread in an owned inbox.",
        description: "Read one thread in an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/get-thread",
    request: { method: "GET", path: "/mailbox/threads/{thread_id}" },
    input: {
        schema: { pathParams: zThreadId, queryParams: zMailboxSelection },
    },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
