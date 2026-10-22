import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zThreadListQuery } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "List Threads",
        summary: "Page through threads in an owned inbox.",
        description: "Page through threads in an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/list-threads",
    request: { method: "GET", path: "/mailbox/threads" },
    input: { schema: { queryParams: zThreadListQuery } },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
