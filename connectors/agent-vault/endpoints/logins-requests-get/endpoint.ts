import { defineEndpoint } from "@shared/core";
import { zLoginRequestPathParams } from "./schema/inputs.ts";

/** Agent Vault `GET /v1/logins/requests/{id}`. */
export default defineEndpoint({
    meta: {
        displayName: "Get Login Request",
        summary:
            "Check whether the account holder has approved a pending signup " +
            "request.",
        description: "Returns the status of a signup request filed with POST " +
            "/v1/logins/requests: pending, approved, denied or expired. " +
            "Pending requests expire after 24 hours. Once approved, the " +
            "response includes the new login's mock tokens so the agent can " +
            "complete the signup. Only the key that filed the request can " +
            "read it. It never returns a password and does not file new " +
            "requests.",
        docsUrl: "https://docs.agentvault.io/reference/http-api",
        categories: ["agent-identity"],
        notes: [
            "Only the key that filed the request can read it. Reads are " +
            "not counted against the per-minute or daily limits.",
            "If the holder says they approved but the request still reads " +
            "`pending`, the approval was blocked; do not file a second " +
            "request.",
        ],
    },
    request: { method: "GET", path: "/v1/logins/requests/{id}" },
    input: { schema: { pathParams: zLoginRequestPathParams } },
});
