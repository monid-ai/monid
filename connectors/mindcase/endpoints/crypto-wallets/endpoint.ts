import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCryptoWalletsBody } from "./schema/inputs.ts";

/**
 * Mindcase `crypto/wallets`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Crypto Wallet Labels",
        summary: "Looks up known entity labels (exchange, individual, " +
            "protocol) for cryptocurrency wallet addresses.",
        description: "Looks up known entity labels (exchange, individual, " +
            "protocol) for cryptocurrency wallet addresses. Returns one " +
            "row per wallet label with address, entityName, entityType, " +
            "labels. For a wallet's transfer history use " +
            "mindcase#crypto/wallet-transfers; for a token's top holders " +
            "use mindcase#crypto/token-holders. $0.006 per wallet label; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/crypto/wallets",
        categories: ["onchain-data"],
    },
    endpoint: "/crypto/wallets",
    request: { method: "POST", path: "/v1/data/crypto/wallets/run" },
    input: {
        schema: {
            body: zCryptoWalletsBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.006 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.addresses.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
