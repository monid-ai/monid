import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zUnitConvertBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Everyday Unit Convert",
        summary: "Convert a value within one of ten unit dimensions.",
        description: "Deterministically convert an explicit numeric value " +
            "between compatible units of length, mass, temperature, area, " +
            "volume, speed, pressure, energy, power, or data size. This " +
            "calculation does not look up current prices or weather, store an " +
            "input history, or invoke Everyday's timer or ask_for tools.",
    },
    endpoint: "/unit-convert",
    request: {
        method: "POST",
        path: "/mcp",
        headers: { "Mcp-Name": "unit_convert" },
    },
    input: {
        schema: { body: zUnitConvertBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: "everyday-unit-convert",
                method: "tools/call",
                params: {
                    name: "unit_convert",
                    arguments: data.input.body ?? {},
                    _meta: {
                        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
                        "io.modelcontextprotocol/clientCapabilities": {},
                    },
                },
            },
        }),
    },
    output: {
        schema: z.object({
            dimension: z.string(),
            value: z.number(),
            from: z.string(),
            to: z.string(),
            result: z.number(),
        }),
    },
});
