import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zDraftId, zMailboxSelection } from "../../schema/drafts.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get Draft",
        summary: "Read a saved draft and its revision.",
        description:
            "Read the current saved revision of a draft in an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/get-draft",
    request: { method: "GET", path: "/mailbox/drafts/{draftId}" },
    input: { schema: { pathParams: zDraftId, queryParams: zMailboxSelection } },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
