import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Get checklist",
        summary: "Get checklist",
        description:
            "Use this when the user asks what to do next, how prepared the household is, or about insurance, estate documents, an emergency fund, retirement accounts, or credit freezes; for an explicit saved tax-review request, use includeTaxReviews to read current scoped results. Get the household's readiness checklist: 0-100 score, 30-day change, and each item's status, evidence, and points. Edits happen in BetterOff. Set includeTaxReviews only for an explicit request to read saved tax reviews; summaries use current saved facts. Requires BetterOff Core and checklist:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/get_checklist",
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
                    name: "betteroff_get_checklist",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
