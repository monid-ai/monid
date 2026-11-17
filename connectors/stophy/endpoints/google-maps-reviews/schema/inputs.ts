import { z } from "zod";
import { zCursor, zLanguageTag } from "../../../schema/common.ts";

/** `POST /v1/google/maps/reviews` request body — the faithful vendor
 *  mirror. The vendor takes `placeUrl` or `placeId`, not both; the binding
 *  enforces it. */
export const zGoogleMapsReviewsBody = z.object({
    placeUrl: z.string().describe(
        "Link to the Google Maps place, like https://maps.app.goo.gl/Xa3bN7cQ. " +
            "Send this or placeId.",
    ).optional(),
    placeId: z.string().describe(
        "Google Maps place id, like ChIJN1t_tDeuEmsRUsoyG83frY4, or the " +
            "placeId from stophy#google/maps/search. Send this or placeUrl.",
    ).optional(),
    sort: z.enum(["relevance", "newest", "highest", "lowest"]).describe(
        "Vendor default newest.",
    ).optional(),
    language: zLanguageTag.describe(
        "BCP 47 language tag (vendor default en).",
    ).optional(),
    cursor: zCursor.optional(),
}).strict();
