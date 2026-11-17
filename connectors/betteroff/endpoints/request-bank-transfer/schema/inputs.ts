import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
const zCreate = z.strictObject({
    "sourceAccountId": z.string().max(64).describe(
        "Natural account ID to pull from, from this tool's account list.",
    ),
    "destinationAccountId": z.string().max(64).describe(
        "Natural account ID to send to, from this tool's account list.",
    ),
    "amountUsd": z.string().regex(new RegExp("^\\d{1,7}(\\.\\d{1,2})?$"))
        .describe("US dollar amount as a decimal string, at most 2 decimals."),
    "idempotencyKey": z.string().regex(new RegExp("^[A-Za-z0-9_-]{8,100}$"))
        .describe(
            "Required for outside agents. Reuse the same key when retrying the same request; use a new key for a new one.",
        ),
});

// Empty input discovers eligible accounts. Creating a request requires every
// field, including the outside-agent idempotency key. Partial requests fail closed.
export const zBody = z.union([z.strictObject({}), zCreate]);
