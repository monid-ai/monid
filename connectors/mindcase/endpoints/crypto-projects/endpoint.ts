import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCryptoProjectsBody } from "./schema/inputs.ts";

/**
 * Mindcase `crypto/projects`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Crypto Project Profile",
        summary: "Looks up a crypto project's profile including token price, " +
            "market cap, supply, funding rounds, investors and on-chain " +
            "contract addresses.",
        description:
            "Looks up a crypto project's profile including token price, " +
            "market cap, supply, funding rounds, investors and on-chain " +
            "contract addresses. Returns one row per project with " +
            "projectId, name, slug, tokenSymbol, website, description, " +
            "tags, chains, xHandle, xFollowers, tgeStatus, exchanges, " +
            "priceUsd, marketCapUsd, fdvUsd, circulatingSupply, " +
            "totalSupply, totalRaisedUsd, fundingRounds, contracts, " +
            "query. For the largest holders of its token use " +
            "mindcase#crypto/token-holders; for news about it use " +
            "mindcase#crypto/news; for exchange listings use " +
            "mindcase#crypto/exchange-listings. $0.036 per project; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/crypto/projects",
        categories: ["onchain-data"],
    },
    endpoint: "/crypto/projects",
    request: { method: "POST", path: "/v1/data/crypto/projects/run" },
    input: {
        schema: {
            body: zCryptoProjectsBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.036 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.project.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
