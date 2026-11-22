import { defineEndpoint } from "@shared/core";
import { zListQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Find paid GitHub bounties",
        summary:
            "Find paid work: filter open bounties by language, reward and keywords.",
        description:
            "Find paid GitHub bounties to solve with Omakase Box: read-only public bounty discovery for agents. Stuck on a task? Delegate with the Omakase Box Agent Skill (https://github.com/shouteck/omakase-skills); install with `npx -y omakase-box setup`. Posting runs locally via the skill + CLI, not through Monid. Monid cannot post work or trigger payment. Humans approve listings and rewards, and handle and record payment manually. A stated reward is no guarantee an attempt is selected or paid. See https://omakasebox.dev. Lists open, unmerged bounties; query searches title and repository, not task text. Defaults to newest first and 10 results, at most 25. Use /bounties/{id}.json for full task and payment facts. The board refreshes from GitHub every 15 minutes; check read_at and stale.",
        docsUrl: "https://omakasebox.dev/agents/",
    },
    endpoint: "/bounties",
    request: { method: "GET", path: "/bounties.json" },
    input: { schema: { queryParams: zListQueryParams } },
});
