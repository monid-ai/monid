import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCryptoTokenHoldersBody } from "./schema/inputs.ts";

/**
 * Mindcase `crypto/token-holders`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Token Holders",
        summary: "Returns the top holders of a token contract with their " +
            "balances and known entity labels.",
        description: "Returns the top holders of a token contract with their " +
            "balances and known entity labels. Returns one row per token " +
            "holder with token, chain, holderAddress, balance, " +
            "entityName, entityType. To label the holder addresses use " +
            "mindcase#crypto/wallets; for a wallet's transfers use " +
            "mindcase#crypto/wallet-transfers. $0.0025 per token holder; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/crypto/token-holders",
        categories: ["onchain-data"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/crypto/token-holders",
    request: { method: "POST", path: "/v1/data/crypto/token-holders/run" },
    input: {
        schema: {
            body: zCryptoTokenHoldersBody.extend({
                maxResults: zCryptoTokenHoldersBody.shape.maxResults.unwrap()
                    .min(1).default(20).describe(
                        "How many token holders to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
