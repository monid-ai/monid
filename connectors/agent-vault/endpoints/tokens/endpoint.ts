import { defineEndpoint } from "@shared/core";
import { zTokensQueryParams } from "./schema/inputs.ts";

/** Agent Vault `GET /v1/tokens`. */
export default defineEndpoint({
    meta: {
        displayName: "List Mock Tokens",
        summary:
            "List the mock tokens that stand in for the account holder's " +
            "saved cards, logins, identity details and addresses.",
        description:
            "Returns the catalog of mock tokens for the cards, logins, " +
            "identity details and addresses the account holder has saved in " +
            "Agent Vault. Pass a page URL to narrow the results to the cards " +
            "and logins registered for that site. Agents fill these tokens " +
            "into checkout and sign-in forms, and Agent Vault swaps each one " +
            "for the real value inside its own browser after checking the " +
            "holder's rules. A token typed anywhere outside Agent Vault's " +
            "browser is a plain string and does nothing, so this endpoint " +
            "never returns a real card number, security code or password. It " +
            "does not open a browser or fill a page. That runs through the " +
            "Agent Vault MCP server or Playwright SDK.",
        docsUrl: "https://docs.agentvault.io/reference/http-api",
        categories: ["agent-identity"],
        notes: [
            "Responses are never cached and never contain a real card " +
            "number, security code or password.",
        ],
    },
    request: { method: "GET", path: "/v1/tokens" },
    input: { schema: { queryParams: zTokensQueryParams } },
});
