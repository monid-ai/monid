import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBookingListingsBody } from "./schema/inputs.ts";

/**
 * Mindcase `booking/listings`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Booking Listings",
        summary: "Booking.com property listings: price, guest score, rooms, " +
            "facilities, photos, location and operator info. By " +
            "destination search or hotel URL.",
        description:
            "Booking.com property listings: price, guest score, rooms, " +
            "facilities, photos, location and operator info. By " +
            "destination search or hotel URL. Returns one row per listing " +
            "with propertyName, propertyUrl, propertyId, propertyType, " +
            "starRating, city, country, fullAddress, latitude, longitude, " +
            "guestScore, scoreLabel, reviewCount, categoryScores, " +
            "priceFrom, currency, rooms, roomTypes, mainImage, images, " +
            "facilities, description, highlights, checkInTime, " +
            "checkOutTime, policies, finePrint, surroundings, traderInfo, " +
            "licenseNumbers and 2 more fields. Call it by search " +
            "(location) or url (urls). For review text use " +
            "mindcase#booking/reviews; for prices across booking sites " +
            "use mindcase#google-hotels/hotels. $0.002 per listing; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/booking/listings",
        categories: ["hotels"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "`checkIn` must be sent together with `checkOut`.",
            "`checkOut` must be sent together with `checkIn`.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/booking/listings",
    request: { method: "POST", path: "/v1/data/booking/listings/run" },
    input: {
        schema: {
            body: zBookingListingsBody.extend({
                maxResults: zBookingListingsBody.shape.maxResults.unwrap().min(
                    1,
                ).describe(
                    "Maximum number of listings to return. Required, at least 1.",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.location ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.urls?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
