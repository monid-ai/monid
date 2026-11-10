import { defineProvider, presets } from "@shared/core";

export default defineProvider({
    name: "sendmux",
    meta: {
        displayName: "Sendmux",
        summary: "Owned email inboxes for agents.",
        description:
            "Create an inbox, manage drafts, and read or send mail from an inbox owned by your workspace.",
        homepageUrl: "https://sendmux.ai",
        docsUrl: "https://sendmux.ai/docs",
        categories: ["agent-email"],
        notes: [
            "Each mailbox action requires the ID of an inbox owned by this workspace.",
            "Register the account webhook callback and signing secret before using mailbox events.",
            "One Sendmux provider key serves the integration. No child mailbox credential is required.",
            "All endpoint calls have a zero call fee. Outgoing mail, incoming mail and retained storage are charged once through inbox usage readings.",
            "The Pro subscription is USD 7 per team per month, separate from inbox usage. There is no per-inbox subscription fee.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://app.sendmux.ai/api/v1" },
    webhooks: {
        "mailbox-events": {
            verify: {
                scheme: "hmac-sha256",
                signatureHeader: "x-sendmux-signature-v2",
                signaturePrefix: "v1=",
                timestampHeader: "x-sendmux-timestamp",
                payload: "${timestamp}.${rawBody}",
                toleranceMs: 300_000,
            },
            route: ({ data, utils }) => {
                const $ = utils.json;
                const type = $.optionalStr(data.delivery.body, "$.type") ??
                    "unknown";
                const value = $.optionalGet(
                    data.delivery.body,
                    "$.data.mailbox_id",
                );
                const mailboxId = typeof value === "string" && value.length > 0
                    ? value
                    : undefined;
                if (mailboxId === undefined) {
                    return {
                        who: { kind: "unhandled", event: type },
                        what: { action: "ignore" },
                    };
                }
                const target = {
                    resource: "sendmux/mailbox",
                    externalId: mailboxId,
                };
                return {
                    who: { kind: "resource", target },
                    what: type === "message.received" ||
                            type === "message.received.spam"
                        ? { action: "refresh", target }
                        : { action: "ignore" },
                };
            },
        },
    },
});
