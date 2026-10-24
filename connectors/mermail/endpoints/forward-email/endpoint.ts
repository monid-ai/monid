import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zForwardEmailArgs } from "./schema/inputs.ts";

/** MCP `forward_email`. Flat 5 credits (email_send). */
export default defineEndpoint({
    meta: {
        displayName: "Forward Mermail email",
        summary: "Forward one message to new recipients.",
        description: "Calls MCP tool forward_email. Provide the new to, " +
            "from, and subject, plus html and/or text, nested under body. " +
            "The structured result is the send receipt. status sent means " +
            "the forward was accepted; delivery is separate. Do not retry " +
            "automatically. To stay on the original thread, call " +
            "`mermail#reply-to-email`.",
        docsUrl: "https://docs.mermail.app/ai/mcp",
        categories: ["email"],
        notes: [
            "5 Mermail API credits per accepted forward.",
            "A successful MCP result is the billable acceptance. Do not " +
            "replay the call.",
        ],
    },
    endpoint: "/forward-email",
    request: {
        method: "POST",
        path: "/mcp",
        headers: { "Mcp-Name": "forward_email" },
    },
    input: {
        schema: { body: zForwardEmailArgs },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: "mermail-forward-email",
                method: "tools/call",
                params: {
                    name: "forward_email",
                    arguments: data.input.body ?? {},
                    _meta: {
                        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
                        "io.modelcontextprotocol/clientCapabilities": {},
                        "io.modelcontextprotocol/clientInfo": {
                            name: "monid",
                            version: "1.0.0",
                        },
                    },
                },
            },
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "email sends",
            consumes: { credit: "default", amount: 5 },
        },
    },
});
