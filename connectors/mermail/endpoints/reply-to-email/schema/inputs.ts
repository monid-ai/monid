import { z } from "zod";
import {
    zEmailId,
    zIdempotencyKey,
    zMailboxId,
    zOutboundBody,
} from "../../../schema/common.ts";

/** Arguments for MCP tool `reply_to_email`. */
export const zReplyEmailArgs = z.object({
    mailboxId: zMailboxId,
    emailId: zEmailId,
    body: zOutboundBody,
    idempotencyKey: zIdempotencyKey,
}).strict();
