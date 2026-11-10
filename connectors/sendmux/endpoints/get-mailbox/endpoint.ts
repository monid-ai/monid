import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "Get Inbox",
        summary: "Read an inbox owned by this workspace.",
        description: "Read the current details of one owned inbox.",
        categories: ["agent-email"],
    },
    request: { method: "GET", path: "/mailboxes/{public_id}" },
    input: {
        schema: {
            pathParams: z.strictObject({ public_id: z.string().min(1) }),
        },
    },
    resources: {
        reads: [{ id: "sendmux/mailbox", key: "$.pathParams.public_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.get(data.output, "$.data"),
    },
});
