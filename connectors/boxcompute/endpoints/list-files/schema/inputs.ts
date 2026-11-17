import { z } from "zod";
import { zSandboxId, zWorkspacePath } from "../../../schema/common.ts";

/**
 * `GET /api/v2/sandboxes/{id}/files/list` — the mirror of its query (D25),
 * plus `sandboxId`, the owned VM. toRequest moves the id into the path and
 * the rest into the query.
 */
export const zListFilesBody = z.object({
    sandboxId: zSandboxId.describe(
        "The id of a VM YOU OWN (from /create-sandbox or /list-sandboxes).",
    ),
    path: zWorkspacePath.describe(
        "The directory to list, an absolute path inside /workspace, e.g. " +
            "/workspace or /workspace/src.",
    ),
    pageSize: z.number().int().min(1).max(1000).describe(
        "Entries per page. Default 1000.",
    ).optional(),
    cursor: z.string().min(1).max(4096).describe(
        "The nextCursor of the previous page, unchanged, to read the next " +
            "one.",
    ).optional(),
}).strict();
