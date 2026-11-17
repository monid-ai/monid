import { z } from "zod";
import { zSandboxId } from "../../../schema/common.ts";

/** `GET /api/v2/sandboxes/{id}` takes only the path id: `sandboxId`, the
 *  owned VM, which toRequest moves into the path. */
export const zGetSandboxBody = z.object({
    sandboxId: zSandboxId.describe(
        "The id of a VM YOU OWN (from /create-sandbox or /list-sandboxes).",
    ),
}).strict();
