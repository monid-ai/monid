import { defineEndpoint } from "@shared/core";

/**
 * MCP `assessment_checklist`: what to count before estimating. The tool
 * takes no arguments, so the endpoint declares no input schema and
 * forwards nothing a caller sends: `arguments` is always `{}`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Sell My Company Data Checklist",
        summary: "What to count in each system before estimating a " +
            "company's data value.",
        description: "Calls MCP tool assessment_checklist. Takes no " +
            "parameters. Returns the privacy rule (counts and date ranges " +
            "only), the rules for gathering figures, what to measure in " +
            "each kind of system (chat, CRM, support, docs, code, email, " +
            "project, finance) and the company facts the estimate needs. " +
            "Call it before `sellmycompanydata#estimate-data-value` when " +
            "the figures are not known yet.",
    },
    endpoint: "/assessment-checklist",
    request: { method: "POST", path: "/mcp" },
    input: {
        toRequest: () => ({
            body: {
                jsonrpc: "2.0",
                id: "sellmycompanydata-assessment-checklist",
                method: "tools/call",
                params: {
                    name: "assessment_checklist",
                    arguments: {},
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
});
