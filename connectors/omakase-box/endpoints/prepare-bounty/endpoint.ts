import { defineEndpoint } from "@shared/core";
import { workflowDescription } from "../../description.ts";
import { zPrepareBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Prepare a packaged branch bounty",
        summary:
            "Check paths before pushing and obtain a bounty branch and issue.",
        description: workflowDescription +
            " Call prepare before pushing. Send exactly repository, commit, title, task, reward and paths, with optional note and boxignore text. Keep serialized JSON within 65536 UTF-8 bytes and paths within 2000 entries. The board checks supplied paths without GitHub reads; it cannot prove completeness or scan contents/history. It returns id, branch, issue.title, issue.body and next unchanged; 400 errors include refused paths when applicable, and 429 means retry later (independent global 10 prepares/minute). Rendered issue title/body must fit GitHub's 256/65536-character limits; the board validates those after rendering. This call does not push, create an issue, import, approve or pay.",
        docsUrl: "https://omakasebox.dev/llms.txt",
    },
    endpoint: "/bounties/prepare",
    request: { method: "POST", path: "/api/agents/prepare" },
    input: { schema: { body: zPrepareBody } },
});
