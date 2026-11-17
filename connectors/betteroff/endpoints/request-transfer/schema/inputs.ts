import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "chain": z.enum(["solana", "base"]).describe(
        "Use solana. Base transfer requests are paused.",
    ),
    "fromWallet": z.string().max(64).describe(
        "Source wallet address tracked by this household.",
    ),
    "toWallet": z.string().max(64).describe(
        "Destination wallet address tracked by this household.",
    ),
    "amountUsdc": z.string().regex(new RegExp("^\\d{1,9}(\\.\\d{1,6})?$"))
        .describe("USDC amount as a decimal string, at most 6 decimals."),
    "idempotencyKey": z.string().regex(new RegExp("^[A-Za-z0-9_-]{8,100}$"))
        .describe(
            "Required for outside agents. Reuse the same key when retrying the same request; use a new key for a new one.",
        ),
});
