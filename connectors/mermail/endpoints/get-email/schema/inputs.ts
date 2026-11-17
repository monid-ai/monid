import { z } from "zod";
import {
    zEmailId,
    zMailboxId,
    zSafeReadQuery,
} from "../../../schema/common.ts";

/** Arguments for MCP tool `get_email`. */
export const zGetEmailArgs = z.object({
    mailboxId: zMailboxId,
    emailId: zEmailId,
    query: z.object({
        ...zSafeReadQuery,
        max_body_chars: z.number().int().positive().max(100_000).optional()
            .describe(
                "Character cap for the returned body. Does not change " +
                    "the stored message. The server ceiling is 100000.",
            ),
    }).strict().optional(),
}).strict();
