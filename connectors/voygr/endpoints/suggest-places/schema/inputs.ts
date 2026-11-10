import { z } from "zod";

/**
 * `POST /v1/places/suggest`. Only `query` is required.
 */
export const zSuggestBody = z.strictObject({
    query: z.string().min(1).max(500).describe(
        "The request in plain English: what you want, where and when. US " +
            "places only. A text that names no place to find gets a 422 " +
            "QUERY_UNPARSEABLE.",
    ),
    location_hint: z.string().max(200).optional().describe(
        "A neighbourhood, city or ZIP. Send no coordinates. A location " +
            "named in `query` wins over it. A 'near me' query " +
            "with no city and no hint gets a 422 LOCATION_REQUIRED.",
    ),
    limit: z.number().int().min(1).max(6).optional().describe(
        "The most cards to return. Default 4, or 6 for a niche request. " +
            "You may get fewer: `short_list_reason` says why.",
    ),
    booking_name: z.string().max(100).optional().describe(
        "The name a booking is held under, written into every " +
            "`call_brief`. Left out, the agent asks for it on the call.",
    ),
    callback_phone: z.string().min(3).max(32).optional().describe(
        "A callback number in E.164, written into every `call_brief`. " +
            "VOYGR checks it like `target_phone` on a call: an invalid " +
            "number gets a 422 invalid_target_phone.",
    ),
});
