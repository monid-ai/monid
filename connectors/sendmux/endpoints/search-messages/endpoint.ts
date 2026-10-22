import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchSnippetsQuery } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Search Messages",
        summary: "Search an owned inbox and read matching snippets.",
        description: "Search an owned inbox and read matching snippets.",
        categories: ["agent-email"],
    },
    endpoint: "/search-messages",
    request: { method: "GET", path: "/mailbox/messages/search-snippets" },
    input: { schema: { queryParams: zSearchSnippetsQuery } },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
