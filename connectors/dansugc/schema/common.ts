import { z } from "zod";

/** A clip id — DansUGC clip UUIDs (dansugc.com/docs#tag/b-roll). */
export const zClipId = z.string().uuid();

/** `YYYY-MM-DD` date filter used by the purchase list. */
export const zIsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
