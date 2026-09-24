import { defineEndpoint } from "@shared/core";
import { body } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Create Task",
        summary:
            "Create a task with assignment, priority, dates, and optional project links.",
        description:
            "Create a task with assignment, priority, dates, and optional project links. Uses the connected Ambiguous identity and its existing permissions. Routine API operations consume no AI actions.",
    },
    endpoint: "/create-task",
    request: { method: "POST", path: "/api/tasks" },
    input: { schema: { body } },
});
