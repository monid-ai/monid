import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zChangesQuery } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Read Inbox Changes",
        summary: "Read a bounded change page for an owned inbox.",
        description: "Read a bounded change page for an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/changes",
    request: { method: "GET", path: "/mailbox/changes" },
    input: { schema: { queryParams: zChangesQuery } },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
