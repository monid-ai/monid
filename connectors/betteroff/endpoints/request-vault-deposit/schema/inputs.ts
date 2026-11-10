import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "vault": z.string().regex(new RegExp("^0x[0-9a-fA-F]{40}$")).describe(
        "Vault address from betteroff_get_vault_yields.",
    ),
    "chainId": z.number().int().min(-9007199254740991).max(9007199254740991)
        .describe(
            "The vault's chainId from betteroff_get_vault_yields; needed when an address is listed on two chains.",
        ).optional(),
    "fromWallet": z.string().regex(new RegExp("^0x[0-9a-fA-F]{40}$")).describe(
        "Household wallet that holds the vault's deposit asset.",
    ),
    "amountUsd": z.string().regex(new RegExp("^\\d{1,9}(\\.\\d{1,6})?$"))
        .describe("Dollar amount as a decimal string, at most 6 decimals."),
    "idempotencyKey": z.string().regex(new RegExp("^[A-Za-z0-9_-]{8,100}$"))
        .describe(
            "Required for outside agents. Reuse the same key when retrying the same request; use a new key for a new one.",
        ),
});
