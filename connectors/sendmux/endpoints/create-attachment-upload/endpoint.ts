import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMailboxSelection } from "../../schema/drafts.ts";

export default defineEndpoint({
    meta: {
        displayName: "Create Attachment Upload",
        summary: "Get a short-lived upload link for a draft attachment.",
        description:
            "Create a bounded attachment upload link for an owned inbox.",
        categories: ["agent-email"],
        notes: [
            "Upload the file to the returned URL before referring to its blob ID in a saved draft.",
        ],
    },
    request: { method: "POST", path: "/mailbox/attachment-uploads" },
    input: {
        schema: {
            queryParams: zMailboxSelection,
            body: z.strictObject({
                filename: z.string().min(1).max(255),
                content_type: z.string().min(1).max(255),
                size_bytes: z.number().int().min(1).max(7_500_000),
            }),
        },
    },
    resources: {
        uses: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
