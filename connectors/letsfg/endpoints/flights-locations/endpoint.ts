import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zLocationsPathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "LetsFG Location Lookup",
        summary:
            "Resolve a city or airport name to the IATA codes LetsFG searches with.",
        description: "Turn a place name into IATA codes for " +
            "letsfg#flights/search and letsfg#flights/discover. Returns the " +
            "matching airports and metro areas with name, city, country and " +
            "type. Prefer a metro code (LON, NYC, TYO) when any airport in " +
            "the city will do, since it searches all of them at once; pick " +
            "one airport code when the traveller named a specific airport. " +
            "Free, and cached, so call it whenever a place is ambiguous.",
        docsUrl: "https://letsfg.co/developers/docs/api-search/",
        categories: ["flights"],
    },
    /** PUBLIC identity (design D1): the native path carries a `{query}`
     *  placeholder, which an endpoint identity cannot. */
    endpoint: "/flights/locations",
    request: { method: "GET", path: "/flights/locations/{query}" },
    input: { schema: { pathParams: zLocationsPathParams } },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
