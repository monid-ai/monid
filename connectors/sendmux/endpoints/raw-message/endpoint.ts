import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMailboxSelection, zMessageId } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Read Raw Message",
        summary: "Read the original message source from an owned inbox.",
        description: "Read the original message source as text.",
        categories: ["agent-email"],
    },
    request: { method: "GET", path: "/mailbox/messages/{message_id}/raw" },
    input: {
        schema: { pathParams: zMessageId, queryParams: zMailboxSelection },
    },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
