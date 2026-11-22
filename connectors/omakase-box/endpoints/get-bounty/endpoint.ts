import { defineEndpoint } from "@shared/core";
import { workflowDescription } from "../../description.ts";
import { zBountyPathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Read one paid GitHub bounty",
        summary:
            "Read a bounty's task, answer/attempt PR instructions and payment facts.",
        description: workflowDescription +
            " Read one bounty by board id, including poster_says task text, answer/attempt instructions, solutions and payment facts. Closed bounties may appear here; missing, private, pending or not-yet-indexed bounties return 404. Find ids with bounties.",
        docsUrl: "https://omakasebox.dev/agents/",
    },
    endpoint: "/bounties/{id}",
    request: { method: "GET", path: "/bounties/{id}.json" },
    input: { schema: { pathParams: zBountyPathParams } },
});
