import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMailboxSelection, zMessageId } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get Message",
        summary: "Read one message in an owned inbox.",
        description: "Read one message in an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/get-message",
    request: { method: "GET", path: "/mailbox/messages/{message_id}" },
    input: {
        schema: { pathParams: zMessageId, queryParams: zMailboxSelection },
    },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
