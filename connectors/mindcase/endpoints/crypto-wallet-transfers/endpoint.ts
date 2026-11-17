import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCryptoWalletTransfersBody } from "./schema/inputs.ts";

/**
 * Mindcase `crypto/wallet-transfers`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Wallet Transfers",
        summary: "Returns on-chain token transfers for a wallet address, " +
            "including the counterparty, token contract and timestamp.",
        description: "Returns on-chain token transfers for a wallet address, " +
            "including the counterparty, token contract and timestamp. " +
            "Returns one row per transfer with txHash, wallet, timestamp, " +
            "flow, tokenAddress, amount, amountUsd, fromAddress, " +
            "toAddress, activityType. To label the counterparties use " +
            "mindcase#crypto/wallets. $0.005 per transfer; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/crypto/wallet-transfers",
        categories: ["onchain-data"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/crypto/wallet-transfers",
    request: { method: "POST", path: "/v1/data/crypto/wallet-transfers/run" },
    input: {
        schema: {
            body: zCryptoWalletTransfersBody.extend({
                maxResults: zCryptoWalletTransfersBody.shape.maxResults.unwrap()
                    .min(1).default(20).describe(
                        "How many transfers to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
