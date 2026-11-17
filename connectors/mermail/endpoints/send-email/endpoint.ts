import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSendEmailArgs } from "./schema/inputs.ts";

/** MCP `send_email`. Flat 5 credits (email_send). */
export default defineEndpoint({
    meta: {
        displayName: "Send Mermail email",
        summary: "Send a new message from a mailbox.",
        description: "Calls MCP tool send_email. Nest Sold fields under " +
            "body: to, from, subject, and html and/or text. A public_id " +
            "is not a valid From. The structured result is the send " +
            "receipt. status sent means Mermail accepted the message; " +
            "recipient delivery is separate. Do not retry automatically. " +
            "To answer an existing message, call " +
            "`mermail#reply-to-email` instead of starting a new thread. " +
            "Attachments are base64 bytes or an attachment_id from this " +
            "mailbox, not a path or URL.",
        docsUrl: "https://docs.mermail.app/ai/mcp",
        categories: ["email"],
        notes: [
            "5 Mermail API credits per accepted send.",
            "A successful MCP result is the billable acceptance. Do not " +
            "replay the call.",
        ],
    },
    endpoint: "/send-email",
    request: {
        method: "POST",
        path: "/mcp",
        headers: { "Mcp-Name": "send_email" },
    },
    input: {
        schema: { body: zSendEmailArgs },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: "mermail-send-email",
                method: "tools/call",
                params: {
                    name: "send_email",
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
