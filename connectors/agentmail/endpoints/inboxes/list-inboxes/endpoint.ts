import { defineEndpoint, UsageModelKind } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "List Your Inboxes",
        summary:
            "List inboxes owned by this workspace, without a pooled vendor list.",
        docsUrl: "https://docs.agentmail.to/api-reference/inboxes/list",
        categories: ["agentic-email"],
        notes: [
            "This list uses synchronized mailbox snapshots. Read an individual inbox for fresh provider details.",
        ],
    },
    endpoint: "/list-inboxes",
    request: { method: "GET", path: "/v0/inboxes" },
    resources: { reads: [{ id: "agentmail/mailbox" }] },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ utils }) => {
            const rows = await utils.resources.owned({
                resource: "agentmail/mailbox",
            });
            const $ = utils.json;
            const items = rows.map((row) => {
                const displayName = $.optionalStr(row.data, "$.displayName");
                return {
                    inboxId: row.externalId,
                    email: row.externalId,
                    ...(displayName !== undefined ? { displayName } : {}),
                    ...(row.syncedAt !== undefined
                        ? { syncedAt: row.syncedAt }
                        : {}),
                };
            });
            return { kind: "COMPLETED", httpStatus: 200, output: items };
        },
    },
});
