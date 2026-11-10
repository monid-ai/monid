import { z } from "zod";
import { zSandboxId } from "../../../schema/common.ts";

/** `DELETE /api/v2/sandboxes/{id}` takes only the path id: `sandboxId`, the
 *  owned VM, which toRequest moves into the path. */
export const zDeleteSandboxBody = z.object({
    sandboxId: zSandboxId.describe("The id of a VM YOU OWN to delete."),
}).strict();
