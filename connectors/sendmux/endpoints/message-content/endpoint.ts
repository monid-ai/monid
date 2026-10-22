import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMessageContentQuery, zMessageId } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Read Message Content",
        summary: "Read bounded message text or HTML.",
        description: "Read bounded message text or HTML.",
        categories: ["agent-email"],
    },
    endpoint: "/message-content",
    request: { method: "GET", path: "/mailbox/messages/{message_id}/content" },
    input: {
        schema: { pathParams: zMessageId, queryParams: zMessageContentQuery },
    },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
