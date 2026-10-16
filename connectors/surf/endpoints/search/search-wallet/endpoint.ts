import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchWalletQueryParams } from "./schema/inputs.ts";

/**
 * GET /search/wallet — Heavy tier, 4 Surf credits per call.
 */
export default defineEndpoint({
    meta: {
        displayName: "Wallet Search",
        summary:
            "Searches wallets by ENS name, address label, or address prefix.",
        description: "Searches wallets by ENS name (vitalik.eth), entity " +
            "label (binance) or address prefix (0xd8dA...), 2-100 " +
            "characters, and returns matching addresses with their entity " +
            "labels (limit up to 100, default 20; offset). Use it to turn a " +
            "name into an address, then pass the address to /wallet/detail " +
            "for balances and tokens, or to /wallet/history or " +
            "/wallet/transfers for activity. To label many known addresses " +
            "at once use /wallet/labels/batch.",
        docsUrl: "https://docs.asksurf.ai/data-api/search/wallet",
        categories: ["onchain-data"],
    },
    request: { method: "GET", path: "/search/wallet" },
    input: {
        schema: {
            // vendor defaults at the binding (D25); the mirror stays optional-only
            queryParams: zSearchWalletQueryParams.extend({
                limit: zSearchWalletQueryParams.shape.limit.unwrap().default(
                    20,
                ),
                offset: zSearchWalletQueryParams.shape.offset.unwrap().default(
                    0,
                ),
            }),
        },
    },
    usage: {
        // Surf's published Heavy tier — v1 makePerCallPrice(surfCredits(4)),
        // the balance-differencing drills of 2026-08 (design D1)
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 4 },
        },
    },
});
