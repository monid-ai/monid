import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `crypto/wallet-transfers` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/crypto/wallet-transfers). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCryptoWalletTransfersBody = z.object({
    address: z.array(z.string())
        .describe("One or more wallet addresses to fetch token transfers for."),
    chain: z.enum(["ethereum", "base", "solana", "tron", "bsc"])
        .describe("The blockchain network the wallet is on.")
        .optional(),
    flow: z.enum(["in", "out"])
        .describe("Filter transfers by direction relative to the wallet.")
        .optional(),
    maxResults: z.number().int().max(100)
        .describe(
            "How many transfers to return in total. Defaults to 20; use 0 for all.",
        )
        .optional(),
}).strict();
