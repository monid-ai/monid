import { z } from "zod";

/**
 * rheono#check request body — the published field list of
 * https://rheono.dev/docs/check-api. One field; the endpoint accepts any
 * host spelling (scheme optional) and normalizes to the hostname itself.
 */
export const zCheckAppBody = z.object({
    url: z.string().min(3).max(300).describe(
        "Site or app address, e.g. https://app.example.com or app.example.com.",
    ),
});
