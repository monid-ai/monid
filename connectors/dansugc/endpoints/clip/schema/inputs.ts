import { z } from "zod";
import { zClipId } from "../../../schema/common.ts";

/** GET /broll/{videoId} path — the vendor mirror. */
export const zClipPathParams = z.object({ videoId: zClipId }).strict();
