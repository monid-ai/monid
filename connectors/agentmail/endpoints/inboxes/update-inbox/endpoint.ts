import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUpdateInboxBody } from "../../../schema/inputs.ts";
import { mailboxOutput, readOrUpdateMailbox } from "../../../schema/mailbox.ts";

export default defineEndpoint({
    meta: {
        displayName: "Update Your Inbox",
        summary: "Change the display name of an inbox you own.",
        docsUrl: "https://docs.agentmail.to/api-reference/inboxes/update",
        categories: ["agentic-email"],
    },
    endpoint: "/update-inboxes/{id}",
    request: { method: "PATCH", path: "/v0/inboxes" },
    input: { schema: { body: zUpdateInboxBody } },
    resources: {
        updates: [{
            id: "agentmail/mailbox",
            key: "$.body.inboxId",
            as: "inbox",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: { start: readOrUpdateMailbox },
    output: { fromResponse: mailboxOutput },
});
