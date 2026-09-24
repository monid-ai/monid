import { defineEndpoint } from "@shared/core";
import { body } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Search Workspace",
        summary: "Search accessible workspace content across modules.",
        description:
            "Search accessible workspace content across modules. Uses the connected Ambiguous identity and its existing permissions. Routine API operations consume no AI actions.",
    },
    endpoint: "/search",
    request: { method: "POST", path: "/api/search" },
    input: { schema: { body } },
});
