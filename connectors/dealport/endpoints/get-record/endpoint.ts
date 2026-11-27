import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGetRecordPathParams } from "./schema/inputs.ts";

/** GET /api/v1/records/{id}: open a cited company or NYC building Record ($0.01). */
export default defineEndpoint({
    meta: {
        displayName: "Dealport Get Record",
        summary:
            "Open a full cited company or NYC building Record by UUID or BBL ($0.01; $0.00 30-day repeat).",
        description:
            "Open the complete cited Record for a US private company (by " +
            "Dealport UUID) or NYC building (by 10-digit BBL). Returns " +
            "primary-sourced facts with basis (`filed`, `observed`, or " +
            "`estimate`), dates, principals, regulatory and filing " +
            "identifiers, source URLs, and Record freshness metadata.",
        docsUrl: "https://dealport.com/docs",
        categories: ["company-enrichment", "real-estate"],
        notes: [
            "Costs $0.01 on first read and $0.00 on repeat reads of the same " +
            "Record in the same workspace within 30 days.",
        ],
    },
    request: { method: "GET", path: "/api/v1/records/{id}" },
    input: { schema: { pathParams: zGetRecordPathParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "records",
            description:
                "new company or building Records opened ($0.00 on 30-day workspace repeat)",
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const costUsd = utils.json.optionalNum(data.output, "$.cost_usd");
            const cents = utils.json.optionalNum(
                data.output,
                "$.credits_charged",
            );
            if (costUsd === 0 || cents === 0) {
                return { counts: { RESULT: 0 } };
            }
            const record = utils.json.optionalGet(data.output, "$.data");
            return {
                counts: {
                    RESULT: record !== null && record !== undefined &&
                            typeof record === "object" && !Array.isArray(record)
                        ? 1
                        : 0,
                },
            };
        },
    },
});
