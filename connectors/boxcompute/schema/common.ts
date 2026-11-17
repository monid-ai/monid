import { z } from "zod";

/** A VM id, as `POST /api/v2/sandboxes` mints it. */
export const zSandboxId = z.string().regex(/^sbx_[a-z0-9]{1,64}$/);

/** The two VM sizes this connector offers (the API also has xl and xxl,
 *  which depend on the BoxCompute account's plan). */
export const zSize = z.enum(["small", "large"]);

/** An absolute path inside /workspace, the only tree the file API serves
 *  (the API's own pattern: no `.` or `..` segments). */
export const zWorkspacePath = z.string().max(4096).regex(
    /^\/workspace(?:\/(?!\.{1,2}(?:\/|$))[^/\0]+)*$/,
);
