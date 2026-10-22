import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zDraftId,
    zMailboxSelection,
    zSendDraftBody,
} from "../../schema/drafts.ts";

export default defineEndpoint({
    meta: {
        displayName: "Send Draft",
        summary: "Send or schedule the exact saved revision of a draft.",
        description:
            "Send a reviewed saved revision, or include a scheduled time to send it later.",
        categories: ["agent-email"],
    },
    request: { method: "POST", path: "/mailbox/drafts/{draftId}/send" },
    input: {
        schema: {
            pathParams: zDraftId,
            queryParams: zMailboxSelection,
            body: zSendDraftBody,
        },
    },
    resources: {
        uses: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
