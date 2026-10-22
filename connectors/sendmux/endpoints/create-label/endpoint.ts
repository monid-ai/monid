import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCreateLabelBody, zMailboxSelection } from "../../schema/reads.ts";

export default defineEndpoint({
    meta: {
        displayName: "Create Label",
        summary: "Create a folder or label in an owned inbox.",
        description: "Create a folder or label in an owned inbox.",
        categories: ["agent-email"],
    },
    endpoint: "/create-label",
    request: { method: "POST", path: "/mailbox/folders" },
    input: {
        schema: { queryParams: zMailboxSelection, body: zCreateLabelBody },
    },
    resources: {
        uses: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
