import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "startDate": z.union([z.iso.date(), z.null()]).describe(
        "Start date (ISO format, e.g. 2026-01-01). Use null for Jan 1 of this year.",
    ),
    "endDate": z.union([z.iso.date(), z.null()]).describe(
        "End date (ISO format). Use null for today.",
    ),
    "accountIds": z.union([z.array(z.string()), z.null()]).describe(
        "Specific account IDs to include. Use null to select by accountType/institution.",
    ),
    "accountType": z.union([
        z.enum([
            "depository",
            "investment",
            "credit",
            "loan",
            "crypto",
            "wallet",
        ]),
        z.null(),
    ]).describe(
        "Optional account type filter. Use investment for brokerage/retirement accounts.",
    ),
    "institution": z.union([
        z.string().describe(
            "Optional institution name filter, e.g. Charles Schwab. Partial matches are accepted.",
        ),
        z.null().describe(
            "Optional institution name filter, e.g. Charles Schwab. Partial matches are accepted.",
        ),
    ]).describe(
        "Optional institution name filter, e.g. Charles Schwab. Partial matches are accepted.",
    ),
    "direction": z.union([z.enum(["all", "inflow", "outflow"]), z.null()])
        .describe(
            "Use inflow for deposits only, outflow for withdrawals only, all for both.",
        ),
    "limit": z.union([
        z.number().int().min(-9007199254740991).max(9007199254740991),
        z.null(),
    ]).describe(
        "Max transaction rows to return for evidence (default 25, max 100).",
    ),
});
