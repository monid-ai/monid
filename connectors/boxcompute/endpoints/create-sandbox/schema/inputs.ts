import { z } from "zod";

/**
 * `POST /api/v2/sandboxes` body — the mirror of the fields a caller sets
 * (D25). start adds `workspaceId`, `vmSandbox` and `metadata` for the
 * pooled account; `diskGiB` and `autoResume` are not exposed, so the
 * account's defaults apply. The sizes this connector offers, and the
 * "small" default, are applied at the binding.
 */
export const zCreateSandboxBody = z.object({
    size: z.enum(["small", "large", "xl", "xxl"]).optional(),
    name: z.string().min(1).max(80).regex(/\S/).describe(
        "A label for the VM, shown by /list-sandboxes.",
    ).optional(),
    blockNetwork: z.boolean().describe(
        "true creates the VM without a network interface: no internet at " +
            "all, and no preview URLs. Default false (outbound internet).",
    ).optional(),
}).strict();
