import { defineEndpoint } from "@shared/core";
import { queryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "List Documents",
        summary:
            "List accessible documents, spreadsheets, and presentations with pagination.",
        description:
            "List accessible documents, spreadsheets, and presentations with pagination. Uses the connected Ambiguous identity and its existing permissions. Routine API operations consume no AI actions.",
    },
    endpoint: "/list-documents",
    request: { method: "GET", path: "/api/documents" },
    input: { schema: { queryParams } },
});
