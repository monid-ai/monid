import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `crypto/wallets` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/crypto/wallets). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCryptoWalletsBody = z.object({
    addresses: z.array(z.string())
        .describe(
            "One or more wallet addresses (EVM 0x or Solana base58) to look up entity labels for.",
        ),
}).strict();
