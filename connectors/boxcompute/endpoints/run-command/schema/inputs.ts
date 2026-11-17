import { z } from "zod";
import { zSandboxId } from "../../../schema/common.ts";

/**
 * `POST /api/v2/sandboxes/{id}/execute` body — the mirror (D25), plus
 * `sandboxId`, the owned VM, which toRequest moves into the path. The
 * binding caps `timeoutSeconds` and narrows `cwd`.
 */
export const zRunCommandBody = z.object({
    sandboxId: zSandboxId.describe(
        "The id of a VM YOU OWN (from /create-sandbox or /list-sandboxes).",
    ),
    argv: z.array(z.string().min(1).max(8192)).min(1).max(64).describe(
        "The program and its arguments, run directly WITHOUT a shell, e.g. " +
            '["python3", "main.py"]. For pipes, redirects, globs or several ' +
            'commands, use ["sh", "-c", "<script>"].',
    ),
    cwd: z.string().regex(/^\/workspace(?:\/.*)?$/).optional(),
    env: z.record(z.string(), z.string()).describe(
        "Extra environment variables for this command only (at most 64).",
    ).optional(),
    timeoutSeconds: z.number().int().min(1).max(900).optional(),
    maxOutputBytes: z.number().int().min(1).max(1_048_576).describe(
        "Cap on each of stdout and stderr; longer output is cut " +
            "(stdoutTruncated / stderrTruncated). Default 262144.",
    ).optional(),
}).strict();
