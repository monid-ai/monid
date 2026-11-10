import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zKeywordPatch,
    zMailboxSelection,
    zMessageId,
} from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Update Message Labels",
        summary: "Change read, flagged, or keyword labels on one message.",
        description: "Update labels on a message in an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/update-message-labels",
    request: { method: "PATCH", path: "/mailbox/messages/{message_id}" },
    input: {
        schema: {
            pathParams: zMessageId,
            queryParams: zMailboxSelection,
            body: zKeywordPatch,
        },
    },
    resources: {
        updates: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
