import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zReplyEmailArgs } from "./schema/inputs.ts";

/** MCP `reply_to_email`. Flat 5 credits (email_send). */
export default defineEndpoint({
    meta: {
        displayName: "Reply to Mermail email",
        summary: "Reply to one message on its existing thread.",
        description: "Calls MCP tool reply_to_email. Read the thread " +
            "first with `mermail#get-email-context`. The server sets " +
            "in_reply_to, references, and thread_id from the original " +
            "message. Provide html and/or text, plus to, from, and " +
            "subject, nested under body. The structured result is the " +
            "send receipt. status sent means the reply was accepted; " +
            "delivery is separate. Do not retry automatically. To send " +
            "to someone else, call `mermail#forward-email`.",
        docsUrl: "https://docs.mermail.app/ai/mcp",
        categories: ["email"],
        notes: [
            "5 Mermail API credits per accepted reply.",
            "A successful MCP result is the billable acceptance. Do not " +
            "replay the call.",
        ],
    },
    endpoint: "/reply-to-email",
    request: {
        method: "POST",
        path: "/mcp",
        headers: { "Mcp-Name": "reply_to_email" },
    },
    input: {
        schema: { body: zReplyEmailArgs },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: "mermail-reply-to-email",
                method: "tools/call",
                params: {
                    name: "reply_to_email",
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
