import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Get portfolio",
        summary: "Get portfolio",
        description:
            "Use this when the user asks about investment holdings, allocation, or concentration. Read portfolio positions, allocation, and concentration for the full filtered portfolio. includePositions false returns the allocation summary; true pages positions by cursor. Requires BetterOff Core and investments:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/get_portfolio",
    request: { method: "POST", path: "/mcp" },
    output: { schema: zOutput },
    input: {
        schema: { body: zBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "betteroff_get_portfolio",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
