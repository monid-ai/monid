import { z } from "zod";
import { zSandboxId } from "../../../schema/common.ts";

/** `POST /api/v2/sandboxes/{id}/start` takes only the path id: `sandboxId`,
 *  the owned VM, which toRequest moves into the path. */
export const zStartSandboxBody = z.object({
    sandboxId: zSandboxId.describe(
        "The id of a VM YOU OWN (from /create-sandbox or /list-sandboxes).",
    ),
}).strict();
