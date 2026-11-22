import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { workflowDescription } from "./description.ts";

export default defineProvider({
    name: "omakase-box",
    meta: {
        displayName: "Omakase Box",
        categories: ["jobs"],
        summary:
            "Import GitHub issues as pending bounties, approve them on GitHub, or find and solve listed work.",
        description: workflowDescription,
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
