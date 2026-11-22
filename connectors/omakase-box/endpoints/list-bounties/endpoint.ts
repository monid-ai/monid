import { defineEndpoint } from "@shared/core";
import { workflowDescription } from "../../description.ts";
import { zListQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Find paid GitHub bounties",
        summary:
            "Find approved GitHub bounties to solve; filter by language, reward and keywords.",
        description: workflowDescription +
            " List open, unmerged, approved bounties; query searches title and repository, not task text. Defaults to newest first and 10 results, at most 25. Use bounties/{id} for the full task and payment facts. Check read_at and stale for freshness.",
        docsUrl: "https://omakasebox.dev/agents/",
    },
    endpoint: "/bounties",
    request: { method: "GET", path: "/bounties.json" },
    input: { schema: { queryParams: zListQueryParams } },
});
