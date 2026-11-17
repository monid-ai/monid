import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `crypto/token-holders` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/crypto/token-holders). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCryptoTokenHoldersBody = z.object({
    tokenAddress: z.string()
        .describe("The contract address of the token to look up holders for."),
    chain: z.enum([
        "ethereum",
        "polygon",
        "bsc",
        "solana",
        "avalanche",
        "arbitrum",
        "optimism",
        "base",
    ])
        .describe("The blockchain network the token contract is deployed on."),
    maxResults: z.number().int().max(100)
        .describe(
            "How many token holders to return in total. Defaults to 20; use 0 for all.",
        )
        .optional(),
}).strict();
