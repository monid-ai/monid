import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSearchBuildingsQueryParams } from "./schema/inputs.ts";

const zBoundSearchBuildingsQuery = zSearchBuildingsQueryParams.extend({
    min_units: zSearchBuildingsQueryParams.shape.min_units.unwrap().default(10),
    limit: zSearchBuildingsQueryParams.shape.limit.unwrap().default(25),
});

/** GET /api/v1/buildings: search NYC multifamily and mixed-use buildings ($0.01/Record). */
export default defineEndpoint({
    meta: {
        displayName: "Dealport Search Buildings",
        summary:
            "Search NYC multifamily and mixed-use buildings by borough, units, mortgage maturity, and signals ($0.01 per new Record).",
        description:
            "Search NYC commercial, multifamily, and mixed-use buildings " +
            "across PLUTO, ACRIS mortgage filings, HPD, DOB, and housing " +
            "records. Filter by borough (`MN`, `BK`, `QN`, `BX`, `SI`), " +
            "minimum unit count, estimated loan maturity year, lender " +
            "category (`agency`, `cmbs`, `bank`), address or owner-of-record " +
            "substring, and distress or regulatory signals. Returns 10-digit " +
            "NYC BBLs that pass directly into Get Record and Research " +
            "Building Owners.",
        docsUrl: "https://dealport.com/docs",
        categories: ["real-estate", "government-data"],
        notes: [
            "Each new building Record returned costs $0.01; repeat reads of " +
            "the same BBL in the same workspace within 30 days cost $0.00.",
        ],
    },
    request: { method: "GET", path: "/api/v1/buildings" },
    input: { schema: { queryParams: zBoundSearchBuildingsQuery } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "building records",
            description:
                "new NYC building Records returned ($0.00 on 30-day workspace repeat)",
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.queryParams.limit },
        }),
        evidence: ({ data, utils }) => {
            const costUsd = utils.json.optionalNum(data.output, "$.cost_usd") ??
                utils.json.optionalNum(data.output, "$.data.cost_usd");
            const cents = utils.json.optionalNum(
                data.output,
                "$.credits_charged",
            ) ?? utils.json.optionalNum(data.output, "$.data.credits_charged");
            if (costUsd === 0 || cents === 0) {
                return { counts: { RESULT: 0 } };
            }
            return {
                counts: {
                    RESULT: utils.json.optionalLen(data.output, "$.data") ?? 0,
                },
            };
        },
    },
});
