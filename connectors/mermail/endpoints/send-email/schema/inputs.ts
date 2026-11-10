import { z } from "zod";
import {
    zIdempotencyKey,
    zMailboxId,
    zOutboundBody,
} from "../../../schema/common.ts";

/** Arguments for MCP tool `send_email`. Sold fields stay under `body`. */
export const zSendEmailArgs = z.object({
    mailboxId: zMailboxId,
    body: zOutboundBody,
    idempotencyKey: zIdempotencyKey,
}).strict();
