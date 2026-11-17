import { defineProvider, presets } from "@shared/core";

/**
 * UnyKorn (unykorn.org) — machine-native compliance, sanctions screening,
 * and smart contract risk intelligence with cryptographic receipts over
 * the UnyKorn Genesis402 rail (`https://twin.unykorn.org`).
 *
 * Auth & Pricing:
 * Endpoints cost $0.01 per call settled in US dollars.
 */
export default defineProvider({
    name: "unykorn",
    meta: {
        displayName: "UnyKorn",
        summary:
            "Machine-native sanctions screening and address verification with cryptographic proof receipts.",
        description:
            "UnyKorn provides machine-native compliance, cryptographic screening, and address verification over HTTP 402 micro-settlement. Check EVM and Solana wallet or contract addresses against OFAC SDN, EU, and UK sanctions lists, scam-address registries, and smart contract anomaly signals with cryptographic proof receipts.",
        homepageUrl: "https://unykorn.org",
        docsUrl: "https://twin.unykorn.org",
        categories: ["onchain-data", "crypto-signals"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://twin.unykorn.org" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: {
        credits: { default: { label: "US dollars" } },
    },
});
