import { z } from "zod";

/** `GET /pack/url-safety` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Optionality mirrors the vendor (D25): the exported schema
 *  keeps `url` optional. Endpoint validation makes it required with
 *  `.required({ url: true })` in endpoint.ts. The vendor takes only
 *  http and https links, so the scheme is checked here. The case-insensitive
 *  match is spelled out in the pattern itself: the JSON Schema conversion
 *  keeps only `regex.source`, so an `i` flag would be lost at the input gate. */
export const zUrlSafetyInput = z.object({
    url: z.string().min(3).max(2000).regex(/^[hH][tT][tT][pP][sS]?:\/\//, {
        message: "url must start with http:// or https://",
    }).describe(
        "The link to check (http or https).",
    ).optional(),
});
