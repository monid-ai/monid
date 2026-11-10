import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zDeleteSandboxBody } from "./schema/inputs.ts";

/**
 * /delete-sandbox — delete an owned VM and its disk (upstream:
 * `DELETE /api/v2/sandboxes/{id}`), the RELEASES anchor of `boxcompute/vm`.
 *
 * Unlike a prepaid resource, a VM should stop costing at once and stop
 * holding a slot in the pooled account's VM limit, so start deletes it now.
 * Already gone (404) is success too. The settle then emits the release
 * mark, and the host's `ops.release` repeats the DELETE, which answers 404
 * and counts as done. A 409 (still stopping or in use) is relayed as data:
 * no mark, and the VM stays owned, so the caller can retry.
 */
export default defineEndpoint({
    meta: {
        displayName: "Delete VM",
        summary: "Delete one of your VMs and everything on its disk.",
        description:
            "Delete a VM you own: it stops, its /workspace disk is erased " +
            "and it stops billing. This cannot be undone. To pause work " +
            "and keep the files, use /stop-sandbox instead.",
        docsUrl: "https://boxcompute.ai/docs/",
        categories: ["code-execution"],
        notes: [
            "409 SANDBOX_UNAVAILABLE means the VM is still busy stopping; " +
            "try again a few seconds later.",
        ],
    },
    endpoint: "/delete-sandbox",
    request: { method: "DELETE", path: "/api/v2/sandboxes/{id}" },
    input: {
        schema: { body: zDeleteSandboxBody },
        // keeps the body: lifecycle.start reads the id from it
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                id: String(
                    (data.input.body as Record<string, unknown>).sandboxId,
                ),
            },
        }),
    },
    resources: {
        releases: [{ id: "boxcompute/vm", key: "$.body.sandboxId" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data, utils }) => {
            const id = String(
                (data.input.body as Record<string, unknown>).sandboxId,
            );
            const res = await utils.http({
                method: "DELETE",
                path: "/api/v2/sandboxes/" + id,
            });
            if ((res.status >= 200 && res.status < 300) || res.status === 404) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 200,
                    output: { sandboxId: id, status: "deleted" },
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
