import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zListMailboxesArgs } from "./schema/inputs.ts";

/** MCP `list_mailboxes`. Flat 1 credit (read). */
export default defineEndpoint({
    meta: {
        displayName: "List Mermail mailboxes",
        summary: "List mailboxes the API key can use.",
        description: "Calls MCP tool list_mailboxes. Lists every mailbox " +
            "on the API key's workspace. An array payload arrives as " +
            "{items}; each item includes email, public_id, receiving " +
            "status, and unread counts by category. Use public_id as " +
            "mailboxId afterwards. Reuse a mailbox with can_receive true, " +
            "receiving_status ready, and no disabled_at. To provision an " +
            "address, call `mermail#create-mailbox`. To read mail, call " +
            "`mermail#list-emails` or `mermail#search-emails`.",
        docsUrl: "https://docs.mermail.app/ai/mcp",
        categories: ["email"],
        notes: ["1 Mermail API credit per call."],
    },
    endpoint: "/list-mailboxes",
    request: {
        method: "POST",
        path: "/mcp",
        headers: { "Mcp-Name": "list_mailboxes" },
    },
    input: {
        schema: { body: zListMailboxesArgs },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: "mermail-list-mailboxes",
                method: "tools/call",
                params: {
                    name: "list_mailboxes",
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
            label: "mailbox reads",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
