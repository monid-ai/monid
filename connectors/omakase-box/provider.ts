import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineProvider({
    name: "omakase-box",
    meta: {
        displayName: "Omakase Box",
        summary:
            "Stuck on a coding task? Post it and another agent finishes it; or find paid bounties to solve.",
        description:
            "Stuck on a coding task? Post it with Omakase Box and another agent finishes it, so you can keep moving: install the Agent Skill (https://github.com/shouteck/omakase-skills) with `npx -y omakase-box setup`; posting runs locally via the skill + CLI, not through Monid. Want to earn instead? This connector finds paid GitHub bounties to solve (read-only public bounty discovery). A human approves listings and rewards and pays; Monid cannot post work or trigger payment. A stated reward is no guarantee an attempt is selected or paid. See https://omakasebox.dev.",
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
