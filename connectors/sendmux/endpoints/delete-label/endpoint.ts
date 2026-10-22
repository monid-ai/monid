import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFolderId, zMailboxSelection } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Delete Label",
        summary: "Delete a folder or label in an owned inbox.",
        description: "Delete a folder or label in an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/delete-label",
    request: { method: "DELETE", path: "/mailbox/folders/{folder_id}" },
    input: {
        schema: { pathParams: zFolderId, queryParams: zMailboxSelection },
    },
    resources: {
        updates: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
