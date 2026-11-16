import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFuelpricesBody } from "./schema/inputs.ts";
import { zFuelpricesOutput } from "./schema/output.ts";

/**
 * johnvc/fuelprices — Find Fuel Prices.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Fuel Prices",
        summary:
            "Live gas and diesel prices at stations near a ZIP code, city, " +
            "or coordinates.",
        description: "Finds fuel stations around a US ZIP code, city, or " +
            "latitude/longitude and returns each station's current price " +
            "for the chosen fuel grade (regular, midgrade, premium, " +
            "diesel), name, address, and how fresh the price report is. One " +
            "row per station.",
        docsUrl: "https://apify.com/johnvc/fuelprices",
        categories: ["maps"],
        notes: [
            "The actor has no result cap: it returns every station it finds " +
            "for the search, so the pre-run estimate is 0 rows and the bill " +
            "is the delivered row count.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/fuelprices",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~fuelprices/runs",
    },
    input: {
        schema: {
            body: zFuelpricesBody,
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zFuelpricesOutput },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // vendor charge event: "apify-default-dataset-item"
            // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: () => ({ counts: { RESULT: 0 } }),
    },
});
