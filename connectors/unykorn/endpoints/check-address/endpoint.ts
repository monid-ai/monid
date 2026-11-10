import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCheckAddressBody } from "./schema/inputs.ts";

/**
 * `POST /check/address` — screen a wallet or contract address against OFAC,
 * EU, and UK sanctions lists, scam registries, and contract anomaly flags.
 */
export default defineEndpoint({
    meta: {
        displayName: "UnyKorn Address Check",
        summary:
            "Screen an EVM or Solana address against sanctions and scam registries with signed receipt.",
        description:
            "Screen a wallet or smart contract address across Base, Ethereum, " +
            "Polygon, Arbitrum, Optimism, or Solana. Verifies against OFAC SDN, " +
            "EU FSF, and UK sanctions lists, scam/fraud databases, and contract " +
            "activity heuristics. Returns a structured verdict ('pass', 'review', or 'block'), " +
            "specific reason codes, source versions, and a tamper-proof cryptographic receipt.",
        docsUrl: "https://twin.unykorn.org/docs",
        categories: ["onchain-data", "crypto-signals"],
        notes: [
            "$0.01 per call in US dollars.",
            "Returns a deterministic cryptographic receipt binding the query parameters.",
        ],
    },
    request: { method: "POST", path: "/check/address" },
    input: { schema: { body: zCheckAddressBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.01 },
            label: "address check",
            description:
                "one address screening check against sanctions and scam registries",
        },
    },
});
