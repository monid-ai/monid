import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zFolderId,
    zMailboxSelection,
    zUpdateLabelBody,
} from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Update Label",
        summary: "Rename or move a folder or label in an owned inbox.",
        description: "Rename or move a folder or label in an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/update-label",
    request: { method: "PATCH", path: "/mailbox/folders/{folder_id}" },
    input: {
        schema: {
            pathParams: zFolderId,
            queryParams: zMailboxSelection,
            body: zUpdateLabelBody,
        },
    },
    resources: {
        updates: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
