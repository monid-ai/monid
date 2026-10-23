import { defineEndpoint } from "@shared/core";
import { zLoginPasswordBody } from "./schema/inputs.ts";

/** Agent Vault `POST /v1/logins/password`. */
export default defineEndpoint({
    meta: {
        displayName: "Rotate Login Password",
        summary:
            "Replace the password on an agent-created login, with Agent Vault " +
            "generating the new one.",
        description:
            "Generates a new password for a login an agent created through " +
            "Agent Vault. Pass the site's password rules, such as length " +
            "limits or allowed symbols, so the new password fits. The login's " +
            "mock tokens stay the same, so any token already in use fills the " +
            "new password. Only the key that created the login can rotate it, " +
            "by default only within seven days of creating it, and only if " +
            "the account holder hasn't replaced the password themselves. " +
            "Requires an API key with signup permission. To add a username " +
            "instead, use POST /v1/logins/username.",
        docsUrl: "https://docs.agentvault.io/reference/http-api",
        categories: ["agent-identity"],
        notes: [
            "Needs an API key with the signup permission, which is off by " +
            "default; without it the call fails with 403 " +
            "`signup_not_enabled`.",
            "Returns 409 `not_rotatable` if the account holder replaced " +
            "the password, or if the login was not created by this key or " +
            "is older than the rotation window (7 days by default). " +
            "Writes count against the account's credential-change budget " +
            "(25 per 24 hours by default).",
        ],
    },
    request: { method: "POST", path: "/v1/logins/password" },
    input: { schema: { body: zLoginPasswordBody } },
});
