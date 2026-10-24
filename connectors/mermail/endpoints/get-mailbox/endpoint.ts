import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zMailboxId } from "../../schema/common.ts";

const zGetMailboxArgs = z.object({
    mailboxId: zMailboxId,
}).strict();

/** MCP `get_mailbox`. Flat 1 credit (read). */
export default defineEndpoint({
    meta: {
        displayName: "Get Mermail mailbox",
        summary: "Fetch one mailbox by public_id, alias id, or email.",
        description: "Calls MCP tool get_mailbox. Returns one mailbox: " +
            "address, name, receiving status, and whether it can receive. " +
            "Unread counts are only on `mermail#list-mailboxes`. A " +
            "disabled mailbox has disabled_at set and should not be " +
            "reused. Then list mail with `mermail#list-emails` or search " +
            "with `mermail#search-emails`.",
        docsUrl: "https://docs.mermail.app/ai/mcp",
        categories: ["email"],
        notes: ["1 Mermail API credit per call."],
    },
    endpoint: "/get-mailbox",
    request: {
        method: "POST",
        path: "/mcp",
        headers: { "Mcp-Name": "get_mailbox" },
    },
    input: {
        schema: { body: zGetMailboxArgs },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: "mermail-get-mailbox",
                method: "tools/call",
                params: {
                    name: "get_mailbox",
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
