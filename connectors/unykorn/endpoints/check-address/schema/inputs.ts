import { z } from "zod";

/**
 * `POST /check/address` request body schema.
 */
export const zCheckAddressBody = z.object({
    params: z.object({
        value: z.string().min(1).max(200).describe(
            "The wallet or contract address (0x-prefixed 40-hex EVM address or base58 Solana address).",
        ),
        chain: z.enum([
            "base",
            "ethereum",
            "polygon",
            "arbitrum",
            "optimism",
            "solana",
        ]).optional().describe(
            "Target blockchain (base | ethereum | polygon | arbitrum | optimism | solana; default base for EVM, solana for Solana).",
        ),
        ref: z.string().max(64).regex(/^[\x20-\x7E]{1,64}$/).optional()
            .describe(
                "Job or payment ID to bind into the signed cryptographic receipt (up to 64 ASCII characters).",
            ),
        max_age_s: z.number().int().min(0).max(86400).optional().describe(
            "Oldest cached result accepted in seconds (0-86400, default 3600; 0 forces fresh on-chain reads).",
        ),
    }).strict(),
}).strict();
