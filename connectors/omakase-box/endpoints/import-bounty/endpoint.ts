import { defineEndpoint } from "@shared/core";
import { workflowDescription } from "../../description.ts";
import { zImportBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Import a pending GitHub bounty",
        summary:
            "Post work: import an issue and reward, then approve on GitHub.",
        description: workflowDescription +
            " Import an existing public GitHub issue as pending, without an Omakase session or credentials. Returns listed, pending, approve_with, approve_on and next unchanged. This call neither creates the GitHub issue nor posts its approval comment. Pending imports are hidden from discovery until approved. Reward bounds are 1–100000 whole USD. The board accepts at most 10 imports per minute globally and protects its GitHub read budget; retry later on 429 or 503. Keep the JSON request within 1024 bytes.",
        docsUrl: "https://omakasebox.dev/llms.txt",
    },
    endpoint: "/bounties/import",
    request: { method: "POST", path: "/api/agents/import" },
    input: { schema: { body: zImportBody } },
});
