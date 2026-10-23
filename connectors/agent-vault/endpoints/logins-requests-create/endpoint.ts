import { defineEndpoint } from "@shared/core";
import { zLoginRequestBody } from "./schema/inputs.ts";

/** Agent Vault `POST /v1/logins/requests`. */
export default defineEndpoint({
    meta: {
        displayName: "Request a New Login",
        summary:
            "Ask the account holder to approve a new account before an agent " +
            "signs up for a site.",
        description:
            "Files a request for an agent to open a new account on a website " +
            "for the account holder, using the site's domain and an email " +
            "address. The holder approves the request in Agent Vault before " +
            "anything is created, unless they've pre-approved that site and " +
            "email, in which case the login is created right away. The vault " +
            "generates the password, so neither the agent nor the account " +
            "holder ever receives it. Requires an API key with signup " +
            "permission, which is off by default. Check the result with GET " +
            "/v1/logins/requests/{id}. It does not fill the site's signup " +
            "form, which runs in the Agent Vault browser through the MCP " +
            "server or SDK.",
        docsUrl: "https://docs.agentvault.io/reference/http-api",
        categories: ["agent-identity"],
        notes: [
            "Needs an API key with the signup permission, which is off by " +
            "default; without it the call fails with 403 " +
            "`signup_not_enabled`.",
            "The request body is limited to 4 KB. Pending requests expire " +
            "after 24 hours, and at most five can await the account " +
            "holder at once (429 `too_many_pending`).",
            "A site and email the holder pre-approved come back " +
            "`approved` at once; poll straight away, since the first poll " +
            "carries the tokens. An account holding 500 logins is refused " +
            "with 403 `login_limit`.",
        ],
    },
    request: { method: "POST", path: "/v1/logins/requests" },
    input: { schema: { body: zLoginRequestBody } },
});
