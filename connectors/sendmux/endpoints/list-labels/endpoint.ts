import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPageQuery } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "List Labels",
        summary: "Page through folders and labels in an owned inbox.",
        description: "Page through folders and labels in an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/list-labels",
    request: { method: "GET", path: "/mailbox/folders" },
    input: { schema: { queryParams: zPageQuery } },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
