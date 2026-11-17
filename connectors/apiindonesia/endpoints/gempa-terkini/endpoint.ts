import { defineEndpoint } from "@shared/core";

/**
 * GET /api/v1/gempa/terkini. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia Latest Earthquakes",
        summary: "The 15 most recent earthquakes recorded by BMKG.",
        description:
            "Return the 15 most recent earthquakes in and around Indonesia as " +
            "published by BMKG, newest first: UTC time, magnitude, depth, " +
            "coordinates, a region description, the tsunami-potential statement and, " +
            "when felt, the MMI intensity per area. Use it to answer 'was there an " +
            "earthquake in X today' or to monitor seismic activity. It takes no input " +
            "and covers recent events only.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#gempa",
        categories: ["government-data", "news-search"],
    },
    request: { method: "GET", path: "/gempa/terkini" },
});
