import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSandboxPathParams } from "../../schema/common.ts";

/**
 * /sleep-sandbox — snapshot a running sandbox to disk now and free its RAM
 * (upstream `POST /v1/sandboxes/{id}/sleep`, worker `sleepSandbox`). From
 * here only `snapshot-storage` accrues until it wakes. USES binding:
 * ownership pre-gate + a reconcile mark (the billing lines just moved).
 */
export default defineEndpoint({
    meta: {
        displayName: "Sleep Sandbox",
        summary:
            "Put your sandbox to sleep: memory snapshotted to disk, only storage billed.",
        description:
            "Put one of YOUR running sandboxes to sleep now instead of " +
            "waiting for its idle timer. Its memory and files are " +
            "snapshotted to disk and its RAM freed; while asleep it is " +
            "billed only for the snapshot ($0.08 per GiB-month). The next " +
            "/exec (or /wake-sandbox) restores it exactly as it was. " +
            "Returns the sandbox object; sleeping an already-sleeping " +
            "sandbox is a no-op.",
        docsUrl: "https://docs.kosa8.com/guides/cloud/",
        categories: ["code-execution"],
        notes: [
            "Only a running sandbox can sleep; any other state answers " +
            "409 not_running.",
        ],
    },
    endpoint: "/sleep-sandbox",
    request: { method: "POST", path: "/v1/sandboxes/{id}/sleep" },
    input: { schema: { pathParams: zSandboxPathParams } },
    resources: {
        uses: [{ id: "kosa8/sandbox", key: "$.pathParams.id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
