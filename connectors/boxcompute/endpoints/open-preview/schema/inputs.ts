import { z } from "zod";
import { zSandboxId } from "../../../schema/common.ts";

/**
 * `POST /api/v2/sandboxes/{id}/previews` body — the mirror (D25), plus
 * `sandboxId`, the owned VM, which toRequest moves into the path.
 */
export const zOpenPreviewBody = z.object({
    sandboxId: zSandboxId.describe(
        "The id of a running VM YOU OWN (from /create-sandbox or " +
            "/list-sandboxes).",
    ),
    port: z.number().int().min(1).max(65535).describe(
        "The VM port the server listens on, e.g. 3000 or 8080.",
    ),
}).strict();
