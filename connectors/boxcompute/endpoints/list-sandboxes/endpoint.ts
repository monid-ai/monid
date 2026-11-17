import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * /list-sandboxes — the VMs this workspace owns, served ENTIRELY from the
 * ownership window (`utils.resources.owned`). Never BoxCompute's
 * `GET /api/v2/sandboxes`, which lists the pooled account's VMs for every
 * workspace. Live state is /get-sandbox's job.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Your VMs",
        summary: "List the VMs you own: sandboxId, size, name, network.",
        description:
            "List YOUR VMs from your workspace's owned resources. Each item " +
            "carries the sandboxId every other BoxCompute endpoint takes, " +
            "its size, name and whether its network is blocked. For a " +
            "VM's live state (running, cold, pending), use /get-sandbox.",
        docsUrl: "https://boxcompute.ai/docs/",
        categories: ["code-execution"],
    },
    endpoint: "/list-sandboxes",
    request: { method: "GET", path: "/api/v2/sandboxes" },
    /** READS with NO key: the reader IS the read, nothing to gate. */
    resources: { reads: [{ id: "boxcompute/vm" }] },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ utils }) => {
            const $ = utils.json;
            const rows = await utils.resources.owned({
                resource: "boxcompute/vm",
            });
            // an allowlist, never the raw rows (no host internals)
            const items = rows.map((row) => ({
                sandboxId: row.externalId,
                size: $.optionalStr(row.data, "$.size") ?? "small",
                ...($.optionalStr(row.data, "$.name") !== undefined
                    ? { name: $.str(row.data, "$.name") }
                    : {}),
                blockNetwork: $.optionalGet(row.data, "$.blockNetwork") ===
                    true,
                ...(row.syncedAt !== undefined
                    ? { syncedAt: row.syncedAt }
                    : {}),
            }));
            return { kind: "COMPLETED", httpStatus: 200, output: items };
        },
    },
});
