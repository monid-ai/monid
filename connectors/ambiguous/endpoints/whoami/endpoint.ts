import { defineEndpoint } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "Get Connected Identity",
        summary: "Show the user and workspace this connection acts as.",
        description:
            "Show the user and workspace this connection acts as. Uses the connected Ambiguous identity and its existing permissions. Routine API operations consume no AI actions.",
    },
    endpoint: "/whoami",
    request: { method: "GET", path: "/api/users/me" },
});
