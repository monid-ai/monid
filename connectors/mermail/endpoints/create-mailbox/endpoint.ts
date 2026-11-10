import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCreateMailboxArgs } from "./schema/inputs.ts";

/** MCP `create_mailbox`. Flat 10 credits (provision). */
export default defineEndpoint({
    meta: {
        displayName: "Create Mermail mailbox",
        summary: "Provision a mailbox and return its public_id.",
        description: "Calls MCP tool create_mailbox only after " +
            "`mermail#list-mailboxes` shows no suitable mailbox. email " +
            "and name are required. email must be a hosted @mermail.app " +
            "address or an address on a verified custom domain. The " +
            "structured result includes public_id — use that as mailboxId " +
            "afterwards. A successful create costs 10 API credits, which " +
            "are usage units, not dollars. Pass idempotencyKey for the " +
            "same create intent. After a conflict or an uncertain result, " +
            "list mailboxes and match the normalized address before " +
            "creating again. Then read mail with `mermail#list-emails`.",
        docsUrl: "https://docs.mermail.app/ai/mcp",
        categories: ["email"],
        notes: [
            "10 Mermail API credits per successful create.",
            "idempotencyKey is the MCP argument. The server sends it as " +
            "Idempotency-Key.",
        ],
    },
    endpoint: "/create-mailbox",
    request: {
        method: "POST",
        path: "/mcp",
        headers: { "Mcp-Name": "create_mailbox" },
    },
    input: {
        schema: { body: zCreateMailboxArgs },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: "mermail-create-mailbox",
                method: "tools/call",
                params: {
                    name: "create_mailbox",
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
            label: "mailbox creates",
            consumes: { credit: "default", amount: 10 },
        },
    },
});
