import { z } from "zod";

/**
 * `POST /api/v1/tools/market_snapshot` body: the tool's own inputSchema
 * (GET /api/v1/tools, 2026-11-20). Every argument is optional; an empty
 * body reads the default overview. Mirror carries optionality only (D25);
 * strictness lives at the binding in endpoint.ts.
 */
export const zMarketSnapshotBody = z.object({
    blocks: z.array(
        z.enum([
            "overview",
            "all",
            "indexes",
            "breadth",
            "sectors",
            "rates",
            "volatility",
            "liquidity",
            "crypto",
            "styles",
            "macro",
            "commodities_fx",
            "calendar",
            "symbols",
        ]),
    ).describe(
        "Which blocks to return, each at most once. Default overview = " +
            "indexes, breadth, sectors, rates, volatility, liquidity, " +
            "crypto; all adds styles, macro, commodities_fx and calendar " +
            "(the earnings week).",
    ).optional(),
    symbols: z.array(z.string()).max(25).describe(
        "Your own watchlist, up to 25: stocks, ETFs, $SPX-style indexes, " +
            "crypto (BTC, ETH, SOL read as the coin; stock:SOL for the " +
            "listed stock). Adds the symbols block with the same trend " +
            "fields as the indexes. During the session a stock or ETF row " +
            "also carries delayed_quote, a delayed price about 16 minutes " +
            "behind, beside its last close.",
    ).optional(),
    detail: z.enum(["compact", "full"]).describe(
        "compact (default) trims the sector, style and ETF proxy rows; " +
            "full returns every field.",
    ).optional(),
});
