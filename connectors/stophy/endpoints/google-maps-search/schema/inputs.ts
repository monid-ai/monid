import { z } from "zod";
import { zCountry, zLanguageTag } from "../../../schema/common.ts";

/** `POST /v1/google/maps/search` request body — the faithful vendor
 *  mirror. */
export const zGoogleMapsSearchBody = z.object({
    query: z.string().min(1).max(200),
    location: z.string().min(2).max(200).describe(
        "Where to search, like Austin, TX.",
    ),
    minRating: z.union([
        z.literal(2),
        z.literal(2.5),
        z.literal(3),
        z.literal(3.5),
        z.literal(4),
        z.literal(4.5),
    ]).describe("Only places rated at least this.").optional(),
    openNow: z.boolean().describe(
        "Google Maps' own Hours filter, Open now: only places open at the " +
            "moment of the search.",
    ).optional(),
    country: zCountry.describe(
        "ISO 3166-1 alpha-2 country code (vendor default us).",
    ).optional(),
    language: zLanguageTag.describe(
        "BCP 47 language tag (vendor default en).",
    ).optional(),
    page: z.number().int().min(1).max(10).describe(
        "Page number, starting at 1.",
    ).optional(),
}).strict();
