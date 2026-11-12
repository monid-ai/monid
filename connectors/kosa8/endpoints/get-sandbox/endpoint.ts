import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSandboxPathParams } from "../../schema/common.ts";

/**
 * /get-sandbox — read one owned sandbox (upstream `GET /v1/sandboxes/{id}`,
 * worker `sandboxes.js getSandbox`). Declarative relay behind the READS
 * pre-gate. The org-wide list (`GET /v1/sandboxes`) is deliberately not
 * exposed: Monid's kosa8 account is pooled, so it would show every
 * workspace's sandboxes.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Sandbox",
        summary: "Read the state, size and running time of a sandbox you own.",
        description: "Fetch one of YOUR kosa8 sandboxes: `state` (creating, " +
            "running, sleeping, paused, stopped, error), template, `cpus`, " +
            "`mem_mb`, region, `running_s` and `asleep_s` so far, " +
            "`sleep_after_s`, `delete_after` (epoch ms when kosa8 deletes " +
            "it), `last_error`, and `host_unreachable` (its host has " +
            "missed heartbeats; the sandbox is kept and returns with the " +
            "host).",
        docsUrl: "https://docs.kosa8.com/guides/cloud/",
        categories: ["code-execution"],
    },
    endpoint: "/get-sandbox",
    request: { method: "GET", path: "/v1/sandboxes/{id}" },
    input: { schema: { pathParams: zSandboxPathParams } },
    resources: {
        reads: [{ id: "kosa8/sandbox", key: "$.pathParams.id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
