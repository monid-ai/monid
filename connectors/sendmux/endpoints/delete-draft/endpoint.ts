import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zDraftId, zMailboxSelection } from "../../schema/drafts.ts";

export default defineEndpoint({
    meta: {
        displayName: "Delete Draft",
        summary: "Delete a saved draft in an owned inbox.",
        description:
            "Request deletion of a saved draft that has not begun sending.",
        categories: ["agent-email"],
    },
    endpoint: "/delete-draft",
    request: { method: "DELETE", path: "/mailbox/drafts/{draftId}" },
    input: { schema: { pathParams: zDraftId, queryParams: zMailboxSelection } },
    resources: {
        updates: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
