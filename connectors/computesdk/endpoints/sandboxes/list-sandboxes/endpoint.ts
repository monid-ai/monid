import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * Served from the ownership window only: Monid runs every workspace on one
 * ComputeSDK key, so GET /api/v1/sandboxes would list every workspace's
 * sandboxes.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Your Sandboxes",
        summary: "List the sandboxes you created (id, provider, size, label).",
        description: "List YOUR sandboxes — the ones this workspace created " +
            "and has not destroyed. Each item carries the sandboxId to pass " +
            "to the other sandbox endpoints, plus its provider, size, " +
            "region and label. Use /get-sandbox for live status and cost.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
        categories: ["virtual-machines"],
    },
    endpoint: "/list-sandboxes",
    request: { method: "GET", path: "/api/v1/sandboxes" },
    resources: { reads: [{ id: "computesdk/sandbox" }] },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ utils }) => {
            const rows = await utils.resources.owned({
                resource: "computesdk/sandbox",
            });
            const $ = utils.json;
            const items = rows.map((row) => ({
                sandboxId: row.externalId,
                ...($.optionalStr(row.data, "$.provider") !== undefined
                    ? { provider: $.get(row.data, "$.provider") }
                    : {}),
                ...($.optionalStr(row.data, "$.size") !== undefined
                    ? { size: $.get(row.data, "$.size") }
                    : {}),
                ...($.optionalStr(row.data, "$.region") !== undefined
                    ? { region: $.get(row.data, "$.region") }
                    : {}),
                ...($.optionalStr(row.data, "$.label") !== undefined
                    ? { label: $.get(row.data, "$.label") }
                    : {}),
            }));
            return { kind: "COMPLETED", httpStatus: 200, output: items };
        },
    },
});
