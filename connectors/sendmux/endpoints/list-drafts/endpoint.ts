import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMailboxSelection } from "../../schema/drafts.ts";

export default defineEndpoint({
    meta: {
        displayName: "List Drafts",
        summary: "Page through saved drafts in an owned inbox.",
        description: "List saved drafts, with a limit and continuation cursor.",
        categories: ["agent-email"],
    },
    endpoint: "/list-drafts",
    request: { method: "GET", path: "/mailbox/drafts" },
    input: {
        schema: {
            queryParams: zMailboxSelection.extend({
                limit: z.number().int().min(1).max(100).optional(),
                cursor: z.string().optional(),
            }),
        },
    },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
