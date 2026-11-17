import { z } from "zod";

/** One place to validate, VOYGR's `POIValidateRequest` field for field. */
const zPlace = z.strictObject({
    id: z.string().max(100).optional().describe(
        "Your own identifier for the place, echoed back in its result row.",
    ),
    poi_name: z.string().min(1).max(200).describe("The place's name."),
    address: z.string().max(500).optional().describe(
        "The address as one string. Send this or the parts below.",
    ),
    street: z.string().max(300).optional().describe("Street address."),
    city: z.string().max(200).optional().describe("City."),
    region: z.string().max(200).optional().describe("State or province."),
    postcode: z.string().max(40).optional().describe(
        "Postal or ZIP code.",
    ),
    country: z.string().optional().describe(
        "2-letter ISO country code, for example US.",
    ),
    latitude: z.number().min(-90).max(90).optional().describe(
        "Latitude in decimal degrees (WGS84). Optional but recommended.",
    ),
    longitude: z.number().min(-180).max(180).optional().describe(
        "Longitude in decimal degrees (WGS84). Optional but recommended.",
    ),
});

/** `POST /v1/jobs/validate`. Strict, like each place. */
export const zValidateBatchBody = z.strictObject({
    pois: z.array(zPlace).min(1).max(10_000).describe(
        "The places to validate, 1 to 10,000.",
    ),
});
