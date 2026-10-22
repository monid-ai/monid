import { defineEndpoint } from "@shared/core";
import { zShoppingMergeOutput } from "../../schema/common.ts";
import { zShoppingMergeBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Everyday Shopping Merge",
        summary: "Merge matching ingredients within compatible dimensions.",
        description: "Deterministically merge explicit shopping quantities " +
            "whose normalized names and unit dimensions match. Mass, volume, " +
            "and count stay separate; no synonyms, plural matching, or " +
            "ingredient densities are inferred. The calculation does not " +
            "look up current prices or weather, store an input history, or " +
            "invoke Everyday's timer or ask_for tools.",
        notes: [
            "Everyday validates quantities as non-negative rational strings, " +
            "ingredient names as non-whitespace, and the complete request as " +
            "at most 200 KiB. These cross-field and byte-size rules are " +
            "enforced by the upstream tool.",
        ],
    },
    endpoint: "/shopping-merge",
    request: {
        method: "POST",
        path: "/mcp",
        headers: { "Mcp-Name": "everyday_calculate" },
    },
    input: {
        schema: { body: zShoppingMergeBody },
        toRequest: ({ data, utils }) => ({
            body: {
                jsonrpc: "2.0",
                id: "everyday-shopping-merge",
                method: "tools/call",
                params: {
                    name: "everyday_calculate",
                    arguments: {
                        request: utils.json.merge(data.input.body ?? {}, {
                            action: "shopping_merge",
                        }),
                    },
                    _meta: {
                        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
                        "io.modelcontextprotocol/clientCapabilities": {},
                    },
                },
            },
        }),
    },
    output: { schema: zShoppingMergeOutput },
});
