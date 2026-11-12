import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSandboxPathParams } from "../../schema/common.ts";

/**
 * /delete-sandbox — destroy an owned sandbox NOW (upstream
 * `DELETE /v1/sandboxes/{id}`, worker `deleteSandbox`), the RELEASES
 * anchor of `kosa8/sandbox`.
 *
 * Unlike saperly's prepaid number (whose release endpoint only marks the
 * resource and lets the host tear down at the period end), a sandbox is
 * metered per second, so the run deletes upstream immediately — every
 * second the host waited would be billed. The settle's release mark then
 * has the host run `lifecycle.release`, whose DELETE is 404-tolerant, and
 * read the final counters through `reconcileUsage` (which finds deleted
 * sandboxes via `?all=1`).
 */
export default defineEndpoint({
    meta: {
        displayName: "Delete Sandbox",
        summary: "Delete your sandbox now and stop its billing.",
        description:
            "Delete one of YOUR kosa8 sandboxes: the microVM is destroyed " +
            "with its memory and files, and billing stops. Returns " +
            "`{ok: true, id}`. This cannot be undone; copy anything you " +
            "need out with /exec first.",
        docsUrl: "https://docs.kosa8.com/guides/cloud.html",
        categories: ["code-execution"],
    },
    endpoint: "/delete-sandbox",
    request: { method: "DELETE", path: "/v1/sandboxes/{id}" },
    input: { schema: { pathParams: zSandboxPathParams } },
    resources: {
        releases: [{ id: "kosa8/sandbox", key: "$.pathParams.id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
