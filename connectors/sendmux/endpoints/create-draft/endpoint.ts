import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCreateDraftBody, zMailboxSelection } from "../../schema/drafts.ts";

export default defineEndpoint({
    meta: {
        displayName: "Create Draft",
        summary:
            "Save a new message, reply, reply-all, forward, or adopted draft.",
        description:
            "Create a saved draft in an owned inbox. A source message can prepare a reply, reply-all, forward, or adoption.",
        categories: ["agent-email"],
    },
    endpoint: "/create-draft",
    request: { method: "POST", path: "/mailbox/drafts" },
    input: {
        schema: { queryParams: zMailboxSelection, body: zCreateDraftBody },
    },
    resources: {
        uses: [{ id: "sendmux/mailbox", key: "$.queryParams.mailbox_id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data, utils }) => {
            const res = await utils.http({
                method: "POST",
                path: "/api/v1/mailbox/drafts",
                queryParams: {
                    mailbox_id: utils.json.str(
                        data.input.queryParams ?? {},
                        "$.mailbox_id",
                    ),
                },
                headers: { "Idempotency-Key": data.run.runId },
                body: data.input.body,
            });
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
