import { defineEndpoint } from "@shared/core";
import { zZenschedAccountCreateBody } from "./schema/inputs.ts";

/**
 * Cold-start org creation — email-less, returns zsc_ key immediately.
 */
export default defineEndpoint({
    meta: {
        displayName: "Create ZenSched Organization",
        summary: "Mint a new ZenSched org and zsc_ API key (no email).",
        description: "Create a new ZenSched organization for an agent " +
            "operator. No email or verification required — the response " +
            "includes a zsc_ API key scoped to the new org. Use that key " +
            "as Authorization Bearer on https://mcp.zensched.com/mcp to " +
            "run scheduling tools (locations, shifts, worker invites, GPS " +
            "verify, timesheets). Free tier: 200 MCP calls/day unfunded.",
        docsUrl: "https://www.zensched.com/docs/quickstart/",
        categories: ["field-workforce"],
    },
    endpoint: "/account-create",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zZenschedAccountCreateBody },
        toRequest: ({ data, utils }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "account_create",
                    arguments: {
                        org_name: String(
                            utils.json.get(data.input.body ?? {}, "$.org_name"),
                        ),
                    },
                },
            },
        }),
    },
});
