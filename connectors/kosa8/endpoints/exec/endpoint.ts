import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSandboxPathParams } from "../../schema/common.ts";

/**
 * /exec — run one command in a sandbox you own and wait for it (upstream
 * `POST /v1/sandboxes/{id}/exec`, worker `sandboxes.js execSandbox`,
 * buffered mode). Declarative relay; the USES binding pre-gates
 * ownership and marks the sandbox for a reconcile tick (a sleeping
 * sandbox wakes for the command, which restarts its compute meter).
 *
 * The answer is `{exit, stdout, stderr, woke_ms?}` — the worker decodes
 * the host's base64 output to text. `stream: true` is NOT exposed: it
 * needs the host data plane, which is not on kosa8's production hosts
 * yet (the worker answers 501 not_available).
 */
export const zExecBody = z.object({
    cmd: z.array(z.string().max(8192)).min(1).max(256).describe(
        'The command as an argv list, e.g. ["python3", "-c", ' +
            '"print(6 * 7)"]. No shell is implied: to use pipes, ' +
            'redirects or globs, run ["sh", "-c", "…"].',
    ),
    env: z.array(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*=/)).max(128)
        .describe(
            "Extra environment variables as NAME=value strings, e.g. " +
                '["DEBUG=1"].',
        ).optional(),
    image: z.string().min(1).max(256).describe(
        "Image reference to run the command in. Omit to use the " +
            "template's own image (the usual case).",
    ).optional(),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Run Command in Sandbox",
        summary:
            "Run a command in your sandbox and get its exit code, stdout and stderr.",
        description:
            "Run one command inside a kosa8 sandbox you created and wait " +
            "for it to finish. Returns `exit` (the exit code), `stdout` " +
            "and `stderr` as text, and `woke_ms` when the sandbox was " +
            "asleep and had to be restored first (its files and installed " +
            "packages are still there). The filesystem persists between " +
            "calls on the same sandbox, so an agent can write a file in " +
            "one exec and run it in the next.",
        docsUrl: "https://docs.kosa8.com/guides/cloud.html",
        categories: ["code-execution"],
        notes: [
            "The command must finish within about 30 seconds: kosa8 " +
            "waits that long for its host, then answers 502 host_failed. " +
            "Start longer jobs in the background (`sh -c 'nohup … &'`) " +
            "and poll for their output with later execs.",
            "Output is returned whole, not streamed; keep it small (pipe " +
            "through `head`/`tail`) — very large output makes for a slow " +
            "answer.",
            "A sandbox that is not running or sleeping (e.g. deleted or " +
            "in error) answers 409 not_running.",
        ],
    },
    endpoint: "/exec",
    request: { method: "POST", path: "/v1/sandboxes/{id}/exec" },
    input: {
        schema: { pathParams: zSandboxPathParams, body: zExecBody },
    },
    resources: {
        uses: [{ id: "kosa8/sandbox", key: "$.pathParams.id" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
