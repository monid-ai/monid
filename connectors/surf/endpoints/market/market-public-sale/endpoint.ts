import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMarketPublicSaleQueryParams } from "./schema/inputs.ts";

/**
 * GET /market/public-sale — Standard tier, 2 Surf credits per call.
 */
export default defineEndpoint({
    meta: {
        displayName: "Public Sale / Crowdsale",
        summary: "Returns public sale (IDO/ICO/IEO) information for a project.",
        description: "Returns a project's public token sales (IDO, ICO, " +
            "IEO): sale type, status, price, amount raised and ROI. Look the " +
            "project up by Surf project UUID (id) or by name or symbol (q, " +
            "e.g. bitcoin); at least one is required, and id wins when both " +
            "are given. For the project's Token Generation Event status and " +
            "listing exchanges use /market/tge; for the wider timeline of " +
            "fundraising and token-sale events use /search/fundraising.",
        docsUrl: "https://docs.asksurf.ai/data-api/market/public-sale",
        categories: ["token-prices"],
        notes: [
            "Pass at least one of `id` or `q`; `id` takes priority " +
            "when several are given. A request with none is rejected " +
            "before the wire.",
        ],
    },
    request: { method: "GET", path: "/market/public-sale" },
    input: {
        schema: {
            // the identifier alternatives compile to anyOf (D4); a union arm
            // takes no binding default (ajv never applies defaults inside anyOf)
            queryParams: z.union([
                zMarketPublicSaleQueryParams.required({ id: true }),
                zMarketPublicSaleQueryParams.required({ q: true }),
            ]),
        },
    },
    usage: {
        // Surf's published Standard tier — v1 makePerCallPrice(surfCredits(2)),
        // the balance-differencing drills of 2026-08 (design D1)
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
