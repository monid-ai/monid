import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zV3CallsPositioningQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Asset Positioning",
        summary: "How many tracked accounts are long and short one asset now.",
        description:
            "How the open episodes on one asset are split, right now. A " +
            "count of the accounts long and short, not a share, because a " +
            "caller reading two assets wants the size of each. `asOf` is " +
            "when the last of those episodes last moved, or when it was " +
            "read if none is open.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/positioning",
        categories: ["crypto-signals", "equities"],
        notes: [
            "2 credits per request.",
            "Get `entityId` from elfa#v3/entities (an asset family id).",
        ],
    },
    request: { method: "GET", path: "/v3/calls/positioning" },
    input: {
        schema: {
            queryParams: zV3CallsPositioningQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
