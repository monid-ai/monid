import { defineEndpoint } from "@shared/core";
import { body } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Create Document",
        summary:
            "Create a document, spreadsheet, or presentation in the connected workspace.",
        description:
            "Create a document, spreadsheet, or presentation in the connected workspace. Uses the connected Ambiguous identity and its existing permissions. Routine API operations consume no AI actions.",
    },
    endpoint: "/create-document",
    request: { method: "POST", path: "/api/documents" },
    input: { schema: { body } },
});
