import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { workflowDescription } from "./description.ts";

export default defineProvider({
    name: "omakase-box",
    meta: {
        displayName: "Omakase Box",
        categories: ["jobs"],
        summary:
            "Prepare a packaged branch or import a GitHub issue, approve on GitHub, then find and solve listed work.",
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
