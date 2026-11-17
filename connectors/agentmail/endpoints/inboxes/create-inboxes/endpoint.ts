import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCreateInboxBody } from "../../../schema/inputs.ts";
import { mailboxOutput } from "../../../schema/mailbox.ts";

export default defineEndpoint({
    meta: {
        displayName: "Create Inbox",
        summary: "Create an owned email inbox; $1 pays the first month.",
        docsUrl: "https://docs.agentmail.to/api-reference/inboxes/create",
        categories: ["agentic-email"],
        notes: [
            "Running this spends $1 for the first month; the mailbox renews at $1/month until released.",
            "Only the agentmail.to domain is currently supported.",
        ],
    },
    endpoint: "/create-inboxes",
    request: { method: "POST", path: "/v0/inboxes" },
    input: { schema: { body: zCreateInboxBody } },
    resources: {
        provisions: [{
            id: "agentmail/mailbox",
            seed: ({ data, utils }) => {
                const $ = utils.json;
                const email = $.optionalStr(data.output, "$.email");
                const upstreamInboxId = $.optionalStr(
                    data.output,
                    "$.inbox_id",
                );
                if (
                    email === undefined || email.length < 3 ||
                    email.length > 320 ||
                    !email.includes("@") ||
                    upstreamInboxId === undefined ||
                    upstreamInboxId.length === 0 || upstreamInboxId === "." ||
                    upstreamInboxId === ".."
                ) {
                    // A success that cannot be owned must park for recovery,
                    // never silently become an untracked paid mailbox.
                    throw new Error(
                        "AgentMail created an inbox without usable identifiers",
                    );
                }
                const displayName = $.optionalStr(
                    data.output,
                    "$.display_name",
                );
                const createdAt = $.optionalStr(data.output, "$.created_at");
                const updatedAt = $.optionalStr(data.output, "$.updated_at");
                const status = $.optionalStr(data.output, "$.status");
                return {
                    resource: "agentmail/mailbox",
                    externalId: email,
                    identifier: email,
                    data: {
                        upstreamInboxId,
                        email,
                        ...(displayName !== undefined ? { displayName } : {}),
                        ...(createdAt !== undefined ? { createdAt } : {}),
                        ...(updatedAt !== undefined ? { updatedAt } : {}),
                        ...(status !== undefined ? { status } : {}),
                    },
                };
            },
        }],
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "first month",
            consumes: { credit: "default", amount: 1 },
        },
    },
    lifecycle: {
        start: async ({ data, utils }) => {
            const $ = utils.json;
            const input = data.input.body ?? {};
            const domain = $.optionalStr(input, "$.domain");
            if (
                domain !== undefined && domain.toLowerCase() !== "agentmail.to"
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 501,
                    output: { error: "custom_domain_integration_pending" },
                };
            }
            const username = $.optionalStr(input, "$.username");
            const displayName = $.optionalStr(input, "$.displayName");
            // Escape the marker itself so distinct host IDs cannot collide.
            // UUID/ULID run IDs keep their existing native client_id spelling.
            const clientId = "monid-inbox-" +
                encodeURIComponent(data.run.runId).replace(
                    /[_!'()*]/g,
                    (character) =>
                        "_" +
                        character.charCodeAt(0).toString(16).toUpperCase(),
                ).replace(/%/g, "_");
            if (clientId.length > 256) {
                throw new Error(
                    "host run ID exceeds the native client_id limit",
                );
            }
            const res = await utils.http({
                method: "POST",
                path: "/v0/inboxes",
                body: {
                    ...(username !== undefined ? { username } : {}),
                    ...(domain !== undefined ? { domain: "agentmail.to" } : {}),
                    ...(displayName !== undefined
                        ? { display_name: displayName }
                        : {}),
                    // Resource creates use client_id, not send idempotency headers.
                    client_id: clientId,
                },
            });
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    output: { fromResponse: mailboxOutput },
});
