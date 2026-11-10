import { z } from "zod";
import { zDraftToken } from "../../../schema/common.ts";

/** FrankKi `/preview` body (Backend `previewInput`). */
export const zFrankkiPreviewBody = z.object({
    draftToken: zDraftToken,
    version: z.number().int().positive().describe(
        "Draft version to preview. Defaults to the latest.",
    ).optional(),
});
