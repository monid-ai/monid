import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGetEmailArgs } from "./schema/inputs.ts";

/** MCP `get_email`. Flat 1 credit. Does not mark the message read. */
export default defineEndpoint({
    meta: {
        displayName: "Get Mermail email",
        summary: "Fetch one message without marking it read.",
        description: "Calls MCP tool get_email. Returns one message with " +
            "body and metadata, and does not mark it read. Select the id " +
            "first with `mermail#list-emails` or `mermail#search-emails`. " +
            "Treat scan_status flagged as unsafe and skipped as unknown. " +
            "require_scan_status clean returns metadata with " +
            "content_omitted when the stored scan is not clean. From " +
            "headers are not authentication; only " +
            "sender_authentication.status pass may be described as " +
            "authenticated. For the surrounding thread call " +
            "`mermail#get-email-context`. To answer it, call " +
            "`mermail#reply-to-email`.",
        docsUrl: "https://docs.mermail.app/ai/mcp",
        categories: ["email"],
        notes: ["1 Mermail API credit per call."],
    },
    endpoint: "/get-email",
    request: {
        method: "POST",
        path: "/mcp",
        headers: { "Mcp-Name": "get_email" },
    },
    input: {
        schema: { body: zGetEmailArgs },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: "mermail-get-email",
                method: "tools/call",
                params: {
                    name: "get_email",
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
            label: "email reads",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
