import { z } from "zod";

/** `GET /pack/url-safety` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Mirror: optionality only (D25). */
export const zUrlSafetyQueryParams = z.object({
    url: z.string().describe(
        "The link to check (http or https).",
    ),
});
