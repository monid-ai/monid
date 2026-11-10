import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFolderId, zMailboxSelection } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get Label",
        summary: "Read one folder or label in an owned inbox.",
        description: "Read one folder or label in an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/get-label",
    request: { method: "GET", path: "/mailbox/folders/{folder_id}" },
    input: {
        schema: { pathParams: zFolderId, queryParams: zMailboxSelection },
    },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
