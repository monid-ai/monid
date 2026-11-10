import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";

const zCreateMailboxBody = z.strictObject({
    email: z.email().max(254).describe("Full email address for the new inbox."),
    display_name: z.string().min(1).max(254).optional(),
    quota_bytes: z.number().int().positive().optional(),
});

export default defineEndpoint({
    meta: {
        displayName: "Create Inbox",
        summary: "Create one owned inbox at an explicit email address.",
        description:
            "Create an inbox for this workspace. The inbox ID is used for future mail actions.",
        categories: ["agent-email"],
    },
    request: { method: "POST", path: "/mailboxes" },
    input: { schema: { body: zCreateMailboxBody } },
    resources: {
        provisions: [{
            id: "sendmux/mailbox",
            seed: ({ data, utils }) => {
                const id = utils.json.str(data.output, "$.data.mailbox.id");
                const email = utils.json.str(
                    data.output,
                    "$.data.mailbox.email",
                );
                return {
                    resource: "sendmux/mailbox",
                    externalId: id,
                    identifier: email,
                    data: { email },
                };
            },
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.get(data.output, "$.data.mailbox"),
    },
    lifecycle: {
        start: async ({ data, utils }) => {
            const access = await utils.http({
                method: "GET",
                path: "/api/v1/mailbox/connection",
            });
            if (access.status !== 200) {
                return {
                    kind: "COMPLETED",
                    httpStatus: access.status,
                    output: access.body,
                };
            }
            const res = await utils.http({
                method: "POST",
                path: "/api/v1/mailboxes",
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
