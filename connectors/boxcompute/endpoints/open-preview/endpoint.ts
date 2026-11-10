import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zOpenPreviewBody } from "./schema/inputs.ts";

/**
 * /open-preview — a temporary public HTTPS URL for one port of an owned VM
 * (upstream: `POST /api/v2/sandboxes/{id}/previews`), so a person or a
 * browser tool can open a server the agent started.
 */
export default defineEndpoint({
    meta: {
        displayName: "Open Preview URL",
        summary:
            "Get a one-hour public HTTPS URL to a port of your running VM (HTTP and WebSocket).",
        description:
            "Open a public HTTPS URL that forwards HTTP and WebSocket " +
            "traffic to one port of a VM you own, for showing a web app, " +
            "API or dashboard the agent started. The URL works for one " +
            "hour (expiresAt); open another one after that.",
        docsUrl: "https://boxcompute.ai/docs/",
        categories: ["code-execution"],
        notes: [
            "Anyone with the URL can reach that port until it expires: " +
            "share it only with the person it is for.",
            "The VM must be running and have network (not created with " +
            "blockNetwork). The server should listen on 0.0.0.0, not only " +
            "127.0.0.1.",
            "Traffic through the URL counts as use, so it keeps the VM " +
            "from its 30-minute idle stop.",
        ],
    },
    endpoint: "/open-preview",
    request: { method: "POST", path: "/api/v2/sandboxes/{id}/previews" },
    input: {
        schema: { body: zOpenPreviewBody },
        toRequest: ({ data }) => {
            const body = data.input.body as Record<string, unknown>;
            return {
                pathParams: { id: String(body.sandboxId) },
                body: { port: body.port as number },
            };
        },
    },
    resources: {
        uses: [{ id: "boxcompute/vm", key: "$.body.sandboxId" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
