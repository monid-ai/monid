import { z } from "zod";

/** `GET /phishing/check` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Mirror: optionality only (D25). */
export const zPhishingCheckQueryParams = z.object({
    url: z.string().describe(
        "The link or domain to check, e.g. https://login.example.com/x or " +
            "example.com. It is never requested: only its host and parent " +
            "domains are looked up.",
    ),
});
