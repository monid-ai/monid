import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "protocol": z.union([
        z.string().describe(
            "Filter to a specific protocol name (case-insensitive substring match, e.g. 'aave', 'uniswap'). Use null for all protocols.",
        ),
        z.null().describe(
            "Filter to a specific protocol name (case-insensitive substring match, e.g. 'aave', 'uniswap'). Use null for all protocols.",
        ),
    ]).describe(
        "Filter to a specific protocol name (case-insensitive substring match, e.g. 'aave', 'uniswap'). Use null for all protocols.",
    ),
    "chain": z.union([
        z.string().describe(
            "Filter to a specific chain slug (e.g. 'ethereum', 'base', 'arbitrum'). Use null for all chains.",
        ),
        z.null().describe(
            "Filter to a specific chain slug (e.g. 'ethereum', 'base', 'arbitrum'). Use null for all chains.",
        ),
    ]).describe(
        "Filter to a specific chain slug (e.g. 'ethereum', 'base', 'arbitrum'). Use null for all chains.",
    ),
});
