import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAttachmentIds, zExtractionQuery } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Read Attachment Text",
        summary: "Read the status or result of attachment text extraction.",
        description: "Read the status or result of attachment text extraction.",
        categories: ["agent-email"],
    },
    endpoint: "/attachment-text",
    request: {
        method: "GET",
        path: "/mailbox/messages/{message_id}/attachments/{attachment_id}/text",
    },
    input: {
        schema: { pathParams: zAttachmentIds, queryParams: zExtractionQuery },
    },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
