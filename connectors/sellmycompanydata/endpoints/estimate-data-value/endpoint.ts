import { defineEndpoint, type Json } from "@shared/core";
import { zEstimateDataValueArgs } from "./schema/inputs.ts";

/**
 * MCP `estimate_data_value`: an indicative data licensing range from
 * summary figures. Read-only: it never submits an enquiry.
 */
export default defineEndpoint({
    meta: {
        displayName: "Sell My Company Data Estimate",
        summary: "Estimate what a company's data could be worth if licensed " +
            "for AI training.",
        description: "Calls MCP tool estimate_data_value. Takes headcount, " +
            "founding year, region (us, ca, uk, eu, anz, other) and a list " +
            "of systems, each with a product name and category and, " +
            "optionally, its oldest year, a rough volume, a people count " +
            "and whether it can be exported. Returns an indicative licensing " +
            "range (`low_usd`, `high_usd`, `range`, `headline`), caveats, " +
            "`what_would_move_it`, an owner-facing `offer_prompt`, a " +
            "disclaimer and `estimate_url`, which opens the website " +
            "calculator with the same figures. Companies under 20 staff or " +
            "3 years in business get a rough band flagged `below_bar`. The " +
            "figure comes from the same model as the website calculator. " +
            "Get the counts first with " +
            "`sellmycompanydata#assessment-checklist`. It does not submit " +
            "an enquiry.",
        notes: [
            "The figure moves with headcount, years in business, region and " +
            "the number of systems listed. Record volumes are accepted but " +
            "do not change it today.",
            "`next_step` differs from the MCP server's: the server's version " +
            "names request_offer, which this connector does not include.",
        ],
    },
    endpoint: "/estimate-data-value",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zEstimateDataValueArgs },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: "sellmycompanydata-estimate-data-value",
                method: "tools/call",
                params: {
                    name: "estimate_data_value",
                    arguments: data.input.body ?? {},
                    _meta: {
                        "io.modelcontextprotocol/clientInfo": {
                            name: "monid",
                            version: "1.0.0",
                        },
                    },
                },
            },
        }),
    },
    output: {
        // The server's next_step tells the agent to call request_offer, a
        // write this connector deliberately leaves out. Replace that one
        // field with the route that exists here; every other field passes
        // through as the server sent it. The provider's lifecycle.start
        // sends a non-object structuredContent to fromError, so it is an
        // object here.
        fromResponse: ({ data, utils }) => {
            const structured = utils.json.get(
                data.output,
                "$.result.structuredContent",
            ) as Record<string, Json>;
            return {
                ...structured,
                next_step: "This connector cannot send an offer request: " +
                    "request_offer is not part of it. If the user asks for a " +
                    "data rights check, a review or offers, give them " +
                    "estimate_url. It opens the website calculator with " +
                    "these figures filled in, and they can ask for a review " +
                    "or offers there.",
            };
        },
    },
});
