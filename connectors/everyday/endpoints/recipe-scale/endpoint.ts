import { defineEndpoint } from "@shared/core";
import { zRecipeScaleOutput } from "../../schema/common.ts";
import { zRecipeScaleBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Everyday Recipe Scale",
        summary: "Scale recipe quantities with exact rational arithmetic.",
        description: "Scale explicit ingredient quantities between serving " +
            "counts with exact fraction arithmetic. Notes and instructions " +
            "are returned unchanged; cooking time, temperature, equipment, " +
            "and technique are not inferred. The calculation does not look " +
            "up current prices or weather, store an input history, or invoke " +
            "Everyday's timer or ask_for tools.",
        notes: [
            "Everyday validates serving counts as positive rational strings, " +
            "ingredient quantities as non-negative rational strings, " +
            "ingredient names as non-whitespace, and the complete request as " +
            "at most 200 KiB. These cross-field and byte-size rules are " +
            "enforced by the upstream tool.",
        ],
    },
    endpoint: "/recipe-scale",
    request: {
        method: "POST",
        path: "/mcp",
        headers: { "Mcp-Name": "everyday_calculate" },
    },
    input: {
        schema: { body: zRecipeScaleBody },
        toRequest: ({ data, utils }) => ({
            body: {
                jsonrpc: "2.0",
                id: "everyday-recipe-scale",
                method: "tools/call",
                params: {
                    name: "everyday_calculate",
                    arguments: {
                        request: utils.json.merge(data.input.body ?? {}, {
                            action: "recipe_scale",
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
    output: { schema: zRecipeScaleOutput },
});
