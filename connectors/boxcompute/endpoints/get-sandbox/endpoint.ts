import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGetSandboxBody } from "./schema/inputs.ts";

/**
 * /get-sandbox — one owned VM's live record (upstream:
 * `GET /api/v2/sandboxes/{id}`): state, size, network, last use. A READS
 * binding: the pre-gate answers the uniform 404 for a VM this workspace
 * does not own, and reading never wakes the VM.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get VM",
        summary:
            "Read one of your VMs: state (running, cold, pending, expired), size, network, last use.",
        description:
            "Read the live record of a VM you own. state is 'running', " +
            "'cold' (stopped: files kept, no billing), 'pending' (booting) " +
            "or 'expired' (refused or retired; it will not run again). " +
            "lastUsedAt is when an API call last used it; BoxCompute stops " +
            "a running VM 30 idle minutes after that. Reading does not " +
            "wake the VM.",
        docsUrl: "https://boxcompute.ai/docs/",
        categories: ["code-execution"],
    },
    endpoint: "/get-sandbox",
    request: { method: "GET", path: "/api/v2/sandboxes/{id}" },
    input: {
        schema: { body: zGetSandboxBody },
        toRequest: ({ data }) => ({
            pathParams: {
                id: String(
                    (data.input.body as Record<string, unknown>).sandboxId,
                ),
            },
        }),
    },
    resources: {
        reads: [{ id: "boxcompute/vm", key: "$.body.sandboxId" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
