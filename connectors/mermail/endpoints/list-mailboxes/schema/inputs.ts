import { z } from "zod";

/** Arguments for MCP tool `list_mailboxes`. */
export const zListMailboxesArgs = z.object({
    query: z.object({
        workspaceId: z.string().min(1).optional().describe(
            "Optional workspace id. An API key returns 403 " +
                "workspace_scope_denied when the value does not match " +
                "the key.",
        ),
    }).strict().optional(),
}).strict();
