import { z } from "zod";
import { zMailboxId, zSafeReadQuery } from "../../../schema/common.ts";

/** Arguments for MCP tool `search_emails`. */
export const zSearchEmailsArgs = z.object({
    mailboxId: zMailboxId,
    query: z.object({
        query: z.string().optional().describe(
            "Free text across subject, preview, sender, and recipients.",
        ),
        folder: z.string().optional().describe("Folder id."),
        from: z.string().optional().describe("Sender contains this text."),
        to: z.string().optional().describe("Recipient contains this text."),
        subject: z.string().optional().describe(
            "Subject contains this text.",
        ),
        date_start: z.string().optional().describe(
            "ISO-8601 lower bound. Set this just before an external action.",
        ),
        date_end: z.string().optional().describe("ISO-8601 upper bound."),
        is_read: z.string().optional().describe("true or 1 for read only."),
        is_starred: z.string().optional().describe(
            "true or 1 for starred only.",
        ),
        category: z.string().optional().describe("Category filter."),
        has_attachment: z.string().optional().describe(
            "When present, require at least one attachment.",
        ),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        ...zSafeReadQuery,
    }).strict().optional(),
}).strict();
