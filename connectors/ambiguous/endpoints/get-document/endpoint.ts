import { defineEndpoint } from "@shared/core";
import { pathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get Document",
        summary: "Read an accessible document in its authoring format.",
        description:
            "Read an accessible document in its authoring format. Uses the connected Ambiguous identity and its existing permissions. Routine API operations consume no AI actions.",
    },
    endpoint: "/get-document",
    request: { method: "GET", path: "/api/documents/{id}" },
    input: { schema: { pathParams } },
});
