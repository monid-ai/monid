import { defineEndpoint } from "@shared/core";
import { zBuildCartLinkBody } from "./schema/inputs.ts";

/** build_cart_link — `tools/call` on Loyaltie's MCP server. */
export default defineEndpoint({
    meta: {
        displayName: "Loyaltie Build Cart Link",
        summary:
            "Put products from several brands in one cart and get a loyaltie.com link the person opens to pay.",
        description: "Builds one cart across brands (up to 20 lines) and " +
            "returns a loyaltie.com cart link with the line items and " +
            "subtotal. Give the person the link exactly as returned: they " +
            "review the cart and pay on loyaltie.com with their email, " +
            "shipping address and payment; checkout creates their " +
            "account, so there is no separate sign-up. The agent never pays and never places the " +
            "order. Ask the person to check the total before paying; it " +
            "can include an optional Loyaltie+ membership they can turn " +
            "off at checkout. The link adds one-time purchases; regular " +
            "delivery is set up from the product page. Free.",
        docsUrl: "https://loyaltie.com/skill.md",
        categories: ["shopping"],
    },
    endpoint: "/build-cart-link",
    request: { method: "POST", path: "/api/ucp/mcp" },
    input: {
        schema: { body: zBuildCartLinkBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "build_cart_link",
                    arguments: {
                        ...(data.input.body as Record<string, never>),
                        src: "api",
                        agent_id: "monid",
                    },
                },
            },
        }),
    },
});
