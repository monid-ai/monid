import { z } from "zod";

/** `GET /phishing/check` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Optionality mirrors the vendor (D25); vendor-stated
 *  bounds stay here. */
const base = z.object({
    url: z.string().min(3).max(2000).describe(
        "The link or domain to check, e.g. https://login.example.com/x or example.com. It is never requested.",
    ).optional(),
});

export const zPhishingCheckQueryParams = base.required({ url: true });
