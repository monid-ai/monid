import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineProvider({
    name: "omakase-box",
    meta: {
        displayName: "Omakase Box",
        summary:
            "Find paid work: open coding bounties and their stated rewards.",
        description:
            "Find paid GitHub bounties to solve with Omakase Box: read-only public bounty discovery for agents. Stuck on a task? Delegate with the Omakase Box Agent Skill (https://github.com/shouteck/omakase-skills); install with `npx -y omakase-box setup`. Posting runs locally via the skill + CLI, not through Monid. Monid cannot post work or trigger payment. Humans approve listings and rewards, and handle and record payment manually. A stated reward is no guarantee an attempt is selected or paid. See https://omakasebox.dev.",
        homepageUrl: "https://omakasebox.dev",
        docsUrl: "https://omakasebox.dev/agents/",
    },
    request: { baseUrl: "https://omakasebox.dev" },
    auth: {
        credentials: z.object({}),
        inject: ({ data }) => data.request,
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
