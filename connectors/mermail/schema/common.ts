import { z } from "zod";

/**
 * Fragments shared by two or more Mermail MCP endpoints. These are the
 * tool arguments, not the JSON-RPC envelope. Optionality only — no
 * invented defaults. Objects are strict so a misspelled key fails before
 * a credit is spent, and so a caller cannot select another MCP tool.
 */

/** Prefer public_id from list or create. Alias id and current email
 *  also resolve. */
export const zMailboxId = z.string().min(1).max(500).describe(
    "Mailbox public_id (UUID), hosted alias id, or current email. " +
        "Prefer public_id from mermail#list-mailboxes or " +
        "mermail#create-mailbox.",
);

export const zEmailId = z.string().min(1).max(500).describe(
    "Mermail email id from list, search, send, reply, or forward. " +
        "Not an RFC Message-ID.",
);

/** Safe-read flags. Booleans are sent to MCP as JSON booleans; the
 *  server stringifies them, and `true` is the value that enables the
 *  flag. */
export const zSafeReadQuery = {
    metadata_only: z.boolean().optional().describe(
        "Omit body, snippet, raw headers, and threat URLs.",
    ),
    include_held: z.boolean().optional().describe(
        "Include messages held for auto-draft. Only for the active " +
            "verification flow.",
    ),
    require_scan_status: z.enum(["clean", "flagged", "skipped"]).optional()
        .describe(
            "Require this stored scan status. A mismatch on get returns " +
                "metadata with content omitted; list and search drop the row.",
        ),
    agent_safe_content: z.boolean().optional().describe(
        "Drop sensitive metadata and normalize untrusted text to bounded " +
            "plain text.",
    ),
};

const zFileAttachment = z.object({
    content: z.string().describe(
        "Base64 file bytes, without a data: URL prefix.",
    ),
    filename: z.string().min(1).max(255),
    type: z.string().describe("MIME type, for example application/pdf."),
    disposition: z.enum(["attachment", "inline"]),
    contentId: z.string().optional().describe(
        "Bare Content-ID for an inline PNG, JPEG, GIF, or WebP. " +
            "Reference it from HTML as cid:contentId.",
    ),
    encryption: z.enum(["worker-aes-v1"]).optional().describe(
        "Optional encryption mode the send API accepts.",
    ),
}).strict();

const zExistingAttachment = z.object({
    attachment_id: z.string().min(1).describe(
        "Existing attachment id in the same mailbox.",
    ),
}).strict();

export const zAttachment = z.union([zFileAttachment, zExistingAttachment]);

const zAddressList = z.union([
    z.email(),
    z.array(z.email()),
]);

const zLooseAddressList = z.union([
    z.string(),
    z.array(z.string()),
]);

const zFrom = z.union([
    z.email(),
    z.object({
        email: z.email(),
        name: z.string().optional(),
    }).strict(),
]);

/**
 * Nested `body` for send, reply, and forward. The published schema
 * requires `to`, `from`, and `subject`. Provide `html` and/or `text`;
 * the server rejects a send with neither. Reply and forward still accept
 * the threading fields, and the server fills them from the original
 * message on reply.
 */
export const zOutboundBody = z.object({
    to: zAddressList.describe("Recipient or recipients."),
    cc: zLooseAddressList.optional(),
    bcc: zLooseAddressList.optional(),
    from: zFrom.describe(
        "From address for this mailbox, or {email, name}. A public_id " +
            "is not a valid From.",
    ),
    subject: z.string(),
    html: z.string().optional().describe(
        "HTML body. Markdown is not rendered. For an inline image, use " +
            "cid:contentId.",
    ),
    text: z.string().optional().describe(
        "Plain-text body. Literal whitespace is preserved.",
    ),
    attachments: z.array(zAttachment).max(20).optional().describe(
        "Up to 20 files: base64 bytes, or an attachment_id from this " +
            "mailbox. A local path or URL is not accepted. Omit to keep " +
            "files from source_draft_id; [] clears them.",
    ),
    in_reply_to: z.string().optional(),
    references: z.array(z.string()).optional(),
    thread_id: z.string().optional(),
    source_draft_id: z.string().optional().describe(
        "Send an existing draft. Omit attachments to keep its files.",
    ),
}).strict();

/** Optional MCP idempotency key. The server copies it to Idempotency-Key. */
export const zIdempotencyKey = z.string().min(8).max(255).optional().describe(
    "Reuse only with the identical tool arguments. Mailbox creation " +
        "returns the existing match on replay; other replays conflict " +
        "instead of running twice.",
);
