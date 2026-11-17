import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zInboxBody } from "../../../schema/inputs.ts";
import { mailboxOutput, readOrUpdateMailbox } from "../../../schema/mailbox.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get Your Inbox",
        summary: "Read fresh details of an inbox you own.",
        docsUrl: "https://docs.agentmail.to/api-reference/inboxes/get",
        categories: ["agentic-email"],
    },
    endpoint: "/inboxes/{id}",
    request: { method: "GET", path: "/v0/inboxes" },
    input: { schema: { body: zInboxBody } },
    resources: {
        reads: [{
            id: "agentmail/mailbox",
            key: "$.body.inboxId",
            as: "inbox",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: { start: readOrUpdateMailbox },
    output: { fromResponse: mailboxOutput },
});
