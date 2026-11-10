import { z } from "zod";
import { zMailboxSelection } from "./drafts.ts";
export { zMailboxSelection } from "./drafts.ts";

export const zMessageId = z.strictObject({
    message_id: z.string().min(1).max(255),
});
export const zThreadId = z.strictObject({
    thread_id: z.string().min(1).max(255),
});
export const zFolderId = z.strictObject({
    folder_id: z.string().min(1).max(255),
});
export const zAttachmentIds = zMessageId.extend({
    attachment_id: z.string().min(1).max(255),
});

export const zPageQuery = zMailboxSelection.extend({
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
});

export const zMessageListQuery = zPageQuery.extend({
    q: z.string().max(1000).optional(),
    folder_id: z.string().max(500).optional(),
    thread_id: z.string().max(500).optional(),
    from: z.string().max(500).optional(),
    to: z.string().max(500).optional(),
    cc: z.string().max(500).optional(),
    bcc: z.string().max(500).optional(),
    subject: z.string().max(500).optional(),
    body: z.string().max(500).optional(),
    header_name: z.string().max(500).optional(),
    header_value: z.string().max(500).optional(),
    min_size_bytes: z.number().int().nonnegative().optional(),
    max_size_bytes: z.number().int().nonnegative().optional(),
    keyword: z.string().max(500).optional(),
    not_keyword: z.string().max(500).optional(),
    after: z.iso.datetime({ offset: true }).optional(),
    before: z.iso.datetime({ offset: true }).optional(),
    has_attachment: z.boolean().optional(),
    is_unread: z.boolean().optional(),
    sort_by: z.enum([
        "received_at",
        "sent_at",
        "subject",
        "from",
        "to",
        "size_bytes",
    ]).optional(),
    sort_direction: z.enum(["asc", "desc"]).optional(),
});

export const zSearchSnippetsQuery = zMessageListQuery.omit({
    cursor: true,
    thread_id: true,
    sort_by: true,
    sort_direction: true,
}).extend({
    q: zMessageListQuery.shape.q.unwrap().regex(/\S/),
    message_ids: z.string().optional(),
});

export const zThreadListQuery = zPageQuery.extend({
    q: z.string().max(1000).optional(),
    participant: z.string().max(500).optional(),
    folder_id: z.string().max(500).optional(),
    after: z.string().optional(),
    before: z.string().optional(),
    has_attachment: z.boolean().optional(),
    is_unread: z.boolean().optional(),
    sort_direction: z.enum(["asc", "desc"]).optional(),
});

export const zChangesQuery = zMailboxSelection.extend({
    since_state: z.string().max(1024).optional(),
    limit: z.number().int().min(1).max(500).optional(),
    types: z.string().max(100).optional(),
    messages_since_state: z.string().max(1024).optional(),
    folders_since_state: z.string().max(1024).optional(),
    threads_since_state: z.string().max(1024).optional(),
    submissions_since_state: z.string().optional(),
    identities_since_state: z.string().optional(),
    quotas_since_state: z.string().optional(),
});

export const zMessageContentQuery = zMailboxSelection.extend({
    part: z.enum(["auto", "text", "html"]).optional(),
    max_body_chars: z.number().int().min(1).max(1_000_000).optional(),
    include_headers: z.enum(["none", "selected", "full"]).optional(),
    include_attachments: z.enum(["none", "metadata"]).optional(),
    strip_signature: z.enum(["true", "false"]).optional(),
    strip_quotes: z.enum(["true", "false"]).optional(),
    include_links: z.enum(["true", "false"]).optional(),
    include_html: z.enum(["true", "false"]).optional(),
});

export const zThreadMessagesQuery = zPageQuery.extend({
    sort: z.enum(["asc", "desc"]).optional(),
});

export const zExtractionQuery = zMailboxSelection.extend({
    max_bytes: z.number().int().min(1).max(1_048_576).optional(),
});

export const zKeywordPatch = z.strictObject({
    seen: z.boolean().optional(),
    flagged: z.boolean().optional(),
    keywords: z.record(z.string().min(1).max(255), z.boolean()).optional(),
});

export const zCreateLabelBody = z.strictObject({
    name: z.string().min(1).max(255),
    parent_id: z.string().min(1).max(255).nullable().optional(),
    sort_order: z.number().int().min(0).max(999_999).optional(),
});

export const zUpdateLabelBody = z.strictObject({
    name: z.string().min(1).max(255).optional(),
    parent_id: z.string().min(1).max(255).nullable().optional(),
    sort_order: z.number().int().min(0).max(999_999).optional(),
});
