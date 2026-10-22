import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zDraftId,
    zMailboxSelection,
    zScheduleDraftBody,
} from "../../schema/drafts.ts";

export default defineEndpoint({
    meta: {
        displayName: "Control Draft Schedule",
        summary: "Move or cancel a scheduled draft send.",
        description:
            "Change or cancel a draft's schedule using its saved revision and schedule version.",
        categories: ["agent-email"],
    },
    request: { method: "PATCH", path: "/mailbox/drafts/{draftId}/schedule" },
    input: {
        schema: {
            pathParams: zDraftId,
            queryParams: zMailboxSelection,
            body: zScheduleDraftBody,
        },
    },
    resources: {
        updates: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
