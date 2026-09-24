import { defineEndpoint } from "@shared/core";
import { body, pathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Update Task",
        summary:
            "Update a task; omit unchanged fields and use null to clear nullable fields.",
        description:
            "Update a task; omit unchanged fields and use null to clear nullable fields. Uses the connected Ambiguous identity and its existing permissions. Routine API operations consume no AI actions.",
    },
    endpoint: "/update-task",
    request: { method: "PATCH", path: "/api/tasks/{id}" },
    input: { schema: { body, pathParams } },
});
