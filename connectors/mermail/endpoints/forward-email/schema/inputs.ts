import { z } from "zod";
import {
    zEmailId,
    zIdempotencyKey,
    zMailboxId,
    zOutboundBody,
} from "../../../schema/common.ts";

/** Arguments for MCP tool `forward_email`. */
export const zForwardEmailArgs = z.object({
    mailboxId: zMailboxId,
    emailId: zEmailId,
    body: zOutboundBody,
    idempotencyKey: zIdempotencyKey,
}).strict();
