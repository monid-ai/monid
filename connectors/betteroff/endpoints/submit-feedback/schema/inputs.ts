import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "category": z.enum([
        "bug",
        "confusing_result",
        "missing_capability",
        "suggestion",
    ]),
    "description": z.string().min(1).max(1000).describe(
        "User-approved diagnostic summary. Exclude financial data, credentials, conversation history, and tool payloads.",
    ),
    "toolName": z.string().regex(new RegExp("^betteroff_[a-z_]{1,80}$"))
        .optional(),
    "requestId": z.string().regex(new RegExp("^[A-Za-z0-9_-]{1,128}$"))
        .optional(),
    "client": z.string().regex(new RegExp("^[A-Za-z0-9 ._+-]+$")).min(1).max(80)
        .optional(),
    "clientVersion": z.string().regex(new RegExp("^[A-Za-z0-9 ._+-]+$")).min(1)
        .max(40).optional(),
    "idempotencyKey": z.uuid().describe(
        "Generate once per report; reuse for every retry.",
    ),
    "userApproved": z.literal(true).describe(
        "True only after the user requests or approves sending this report.",
    ),
});
