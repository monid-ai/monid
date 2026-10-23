import { defineEndpoint } from "@shared/core";
import { zLoginUsernameBody } from "./schema/inputs.ts";

/** Agent Vault `POST /v1/logins/username`. */
export default defineEndpoint({
    meta: {
        displayName: "Set Login Username",
        summary:
            "Add a username to an agent-created login that was opened with " +
            "only an email.",
        description:
            "Records the username on a login an agent created through Agent " +
            "Vault, after the site accepts it. The vault then adds a mock " +
            "token for the username, so future sign-ins fill it alongside the " +
            "password. A username can be set once, only by the key that " +
            "created the login, and by default only within seven days of " +
            "creating it. Requires an API key with signup permission. It does " +
            "not change the password. For that, use POST /v1/logins/password.",
        docsUrl: "https://docs.agentvault.io/reference/http-api",
        categories: ["agent-identity"],
        notes: [
            "Needs an API key with the signup permission, which is off by " +
            "default; without it the call fails with 403 " +
            "`signup_not_enabled`.",
            "A username is set once: repeating the same value succeeds, a " +
            "different one returns 409 `username_already_set`. Writes " +
            "count against the account's credential-change budget (25 per " +
            "24 hours by default).",
        ],
    },
    request: { method: "POST", path: "/v1/logins/username" },
    input: { schema: { body: zLoginUsernameBody } },
});
