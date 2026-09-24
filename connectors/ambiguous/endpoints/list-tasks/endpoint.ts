import { defineEndpoint } from "@shared/core";
import { queryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "List Tasks",
        summary: "List and filter tasks in the connected workspace.",
        description:
            "List and filter tasks in the connected workspace. Uses the connected Ambiguous identity and its existing permissions. Routine API operations consume no AI actions.",
    },
    endpoint: "/list-tasks",
    request: { method: "GET", path: "/api/tasks" },
    input: { schema: { queryParams } },
});
