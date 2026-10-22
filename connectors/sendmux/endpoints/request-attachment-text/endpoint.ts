import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAttachmentIds, zExtractionQuery } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Extract Attachment Text",
        summary: "Request text extraction for an attachment.",
        description: "Request text extraction for an attachment.",
        categories: ["agent-email"],
    },
    endpoint: "/request-attachment-text",
    request: {
        method: "POST",
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
