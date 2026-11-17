import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCustomsShipmentsBody } from "./schema/inputs.ts";

/**
 * Mindcase `customs/shipments`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Customs Shipment Records",
        summary:
            "Search customs shipment records by company, product, HS code " +
            "and route, with ports, weight, quantity and value. Covers " +
            "customs filings and trade statistics...",
        description:
            "Search customs shipment records by company, product, HS code " +
            "and route, with ports, weight, quantity and value. Covers " +
            "customs filings and trade statistics from about 95 " +
            "countries, including the United States, Mexico, Brazil, " +
            "Colombia, India, Indonesia, Vietnam, Pakistan, Russia, " +
            "Turkey, the UK and the EU. Returns one row per customs " +
            "shipment record with shipmentId, date, direction, importer, " +
            "exporter, hsCodes, goodsDescriptions, productTags, " +
            "originCountry, originCountryCode, destinationCountry, " +
            "destinationCountryCode, departurePort, arrivalPort, " +
            "transportMode, weightKg, quantity, quantityUnit, valueUsd, " +
            "unitPricePerKgUsd, unitPriceUsd, billOfLading, " +
            "declarationNumber, dataSource. For ranked importers and " +
            "exporters of a product use mindcase#customs/companies; for " +
            "aggregate trade by HS code or country use " +
            "mindcase#customs/trade-stats. $0.032 per customs shipment " +
            "record; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/customs/shipments",
        categories: ["government-data"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/customs/shipments",
    request: { method: "POST", path: "/v1/data/customs/shipments/run" },
    input: {
        schema: {
            body: zCustomsShipmentsBody.extend({
                maxResults: zCustomsShipmentsBody.shape.maxResults.unwrap().min(
                    1,
                ).default(50).describe(
                    "How many customs shipment records to return in total.",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.032 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
