import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zWorkspacePath } from "../../schema/common.ts";
import { zRunCommandBody } from "./schema/inputs.ts";

/**
 * /run-command — run one program in an owned VM and wait for it (upstream:
 * `POST /api/v2/sandboxes/{id}/execute`). A DECLARATIVE relay: the USES
 * binding pre-gates the VM, toRequest moves the id into the path.
 *
 * A non-zero exit is still 200 with `exitCode`: the command ran, and its
 * output is the answer. The API allows 900 s; this binding caps
 * `timeoutSeconds` at 240 so one call stays inside the request timeout,
 * which also covers waking a stopped VM (about 30 s).
 */
export default defineEndpoint({
    meta: {
        displayName: "Run Command",
        summary:
            "Run a command in your VM and get stdout, stderr and the exit code.",
        description:
            "Run one program in a VM you own and wait for it to finish, up " +
            "to 240 s. Returns stdout, stderr, exitCode, and whether it " +
            "timed out or its output was cut. The VM is a normal Linux " +
            "machine with outbound internet unless created without it: " +
            "install packages, write files, run scripts, build and test " +
            "code. Files under /workspace persist across calls and stops.",
        docsUrl: "https://boxcompute.ai/docs/",
        categories: ["code-execution"],
        notes: [
            "A non-zero exit is not an error: the call answers 200 with " +
            "exitCode set.",
            "Each call is a fresh process: environment variables and the " +
            "working directory do not carry over. Chain steps in one " +
            '["sh", "-c", ...] call, or write state to files.',
            'Write a file with a shell, e.g. ["sh", "-c", "cat > ' +
            "/workspace/app.py <<'EOF'\\n...\\nEOF\"].",
            "To keep a server running after the call returns, start it in " +
            "the background (nohup ... &) and open it with /open-preview.",
        ],
    },
    endpoint: "/run-command",
    request: { method: "POST", path: "/api/v2/sandboxes/{id}/execute" },
    input: {
        schema: {
            body: zRunCommandBody.extend({
                // the file API's path form: no . or .. segments, so the
                // working directory cannot climb out of /workspace
                cwd: zWorkspacePath.describe(
                    "Working directory, an absolute path inside /workspace. " +
                        "Default /workspace.",
                ).optional(),
                timeoutSeconds: zRunCommandBody.shape.timeoutSeconds.unwrap()
                    .max(240).describe(
                        "Seconds before the command is killed (timedOut: " +
                            "true). Default 120, at most 240.",
                    ).optional(),
            }),
        },
        toRequest: ({ data }) => {
            const { sandboxId, ...command } = data.input.body as Record<
                string,
                Json
            >;
            return {
                pathParams: { id: String(sandboxId) },
                body: command,
            };
        },
    },
    timeouts: { requestMs: 300_000, runMs: 310_000 },
    resources: {
        uses: [{ id: "boxcompute/vm", key: "$.body.sandboxId" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
