import { defineEndpoint } from "@shared/core";
import { body, pathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Update Document",
        summary:
            "Update document metadata or content; prefer block operations to preserve formatting.",
        description:
            "Update document metadata or content; prefer block operations to preserve formatting. Uses the connected Ambiguous identity and its existing permissions. Routine API operations consume no AI actions.",
    },
    endpoint: "/update-document",
    request: { method: "PATCH", path: "/api/documents/{id}" },
    input: { schema: { body, pathParams } },
});
