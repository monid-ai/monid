import { z } from "zod";
import { zEmailId, zMailboxId } from "../../../schema/common.ts";

/** Arguments for MCP tool `get_email_context`. */
export const zEmailContextArgs = z.object({
    mailboxId: zMailboxId,
    emailId: zEmailId,
    query: z.object({
        limit: z.number().int().min(1).max(50).optional().describe(
            "Oldest-first thread page size. The API default is 20.",
        ),
        cursor: z.string().max(2048).optional().describe(
            "Opaque next_cursor from the previous page.",
        ),
        include_held: z.boolean().optional().describe(
            "Include mail held for auto-draft. Only for the active " +
                "verification flow.",
        ),
    }).strict().optional(),
}).strict();
