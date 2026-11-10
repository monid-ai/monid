import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMessageListQuery } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "List Messages",
        summary: "Page through messages in an owned inbox.",
        description: "Page through messages in an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/list-messages",
    request: { method: "GET", path: "/mailbox/messages" },
    input: { schema: { queryParams: zMessageListQuery } },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
