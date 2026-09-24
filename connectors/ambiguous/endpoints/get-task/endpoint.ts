import { defineEndpoint } from "@shared/core";
import { pathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get Task",
        summary: "Read one accessible task.",
        description:
            "Read one accessible task. Uses the connected Ambiguous identity and its existing permissions. Routine API operations consume no AI actions.",
    },
    endpoint: "/get-task",
    request: { method: "GET", path: "/api/tasks/{id}" },
    input: { schema: { pathParams } },
});
