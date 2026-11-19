import { z } from "zod";

/** `GET /phishing/check` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Optionality mirrors the vendor (D25): the exported schema
 *  keeps `url` optional, as the vendor documents it. Endpoint validation
 *  makes it required with `.required({ url: true })` in endpoint.ts. */
export const zPhishingCheckInput = z.object({
    url: z.string().min(3).max(2000).describe(
        "The link or domain to check, e.g. https://login.example.com/x or example.com. It is never requested.",
    ).optional(),
});
