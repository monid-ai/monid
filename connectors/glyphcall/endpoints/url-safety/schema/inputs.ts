import { z } from "zod";

/** `GET /pack/url-safety` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Optionality mirrors the vendor (D25); vendor-stated
 *  bounds stay here. */
const base = z.object({
    url: z.string().min(3).max(2000).describe(
        "The link to check (http or https).",
    ).optional(),
});

export const zUrlSafetyQueryParams = base.required({ url: true });
