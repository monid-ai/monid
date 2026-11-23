import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zV3EntitiesQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Resolve Entities",
        summary:
            "Resolve a ticker, name, @handle, contract address, CoinGecko id, FIGI or CIK to an Elfa id.",
        description: "Turns what a caller holds into the id every other v3 " +
            "endpoint takes. Asset results are collapsed to one row per " +
            "family; people, projects and organisations remain individual " +
            "entities. A ticker, name, X handle, contract address, " +
            "CoinGecko id, FIGI or CIK resolves; a string naming two " +
            "things returns both, scored. Exact matches only. `solana` " +
            "and `sol` resolve Solana; `sola` resolves the token whose " +
            "ticker is SOLA, not a prefix of Solana; `vitalik` returns " +
            "nothing where `vitalik buterin` or `@VitalikButerin` returns " +
            "the person. A listed company also answers to its name " +
            "without the legal form and share class, so `tesla` resolves " +
            "Tesla, Inc. as a `name` and `coinbase` resolves Coinbase " +
            "Global, Inc. as an `alias`. What the string hit comes back " +
            "as `matchedOn`, and `score` ranks an exact id (a contract " +
            "address, FIGI, CIK or `@handle`) above a symbol above a " +
            "loose alias. A CoinGecko id or a handle without its `@` " +
            "scores as a symbol, since `doge` or `ai` is often another " +
            "coin's ticker. Ties break on how prominent the thing is, " +
            "which is what puts the real USDT above the other " +
            "ninety-five. A contract address that several tokens share " +
            "across chains puts the one on its home chain first and " +
            "scores the rest 0.95. The home chain is Solana for a base58 " +
            "address, and Ethereum, then Base, Arbitrum, BNB Chain, " +
            "Optimism, Polygon and Avalanche for a 0x one. A person or a " +
            "company is only here if Elfa already tracks it, and a handle " +
            "resolves to the entity behind the account rather than to the " +
            "account, because handles change and the id does not.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/resolve-entities",
        categories: ["crypto-signals", "equities"],
        notes: [
            "1 credit, matches or not.",
        ],
    },
    request: { method: "GET", path: "/v3/entities" },
    input: {
        schema: {
            queryParams: zV3EntitiesQueryParams.extend({
                limit: zV3EntitiesQueryParams.shape.limit.unwrap().default(10),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
