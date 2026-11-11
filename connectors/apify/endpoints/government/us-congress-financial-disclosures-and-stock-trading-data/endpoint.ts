import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zUsCongressFinancialDisclosuresAndStockTradingDataBody } from "./schema/inputs.ts";
import { zUsCongressFinancialDisclosuresAndStockTradingDataOutput } from "./schema/output.ts";

/**
 * johnvc/us-congress-financial-disclosures-and-stock-trading-data — List Congress Stock Trades.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "List Congress Stock Trades",
        summary: "US Congressional financial disclosures and stock trades by " +
            "member, date range, or ticker.",
        description:
            "Returns US Congress members' reported stock transactions from " +
            "their financial disclosures, filtered by first or last name, " +
            "an exact report date or date range, and ticker symbol: member, " +
            "transaction date, ticker, asset, type, amount range, and the " +
            "disclosure link. One row per transaction.",
        docsUrl:
            "https://apify.com/johnvc/us-congress-financial-disclosures-and-stock-trading-data",
        categories: ["government-data"],
        notes: [
            "Billing: a one-time setup fee plus one transaction_processed " +
            "event per record in Max_Results, charged when the run starts " +
            "(the actor's own text: the cap is what is paid), so the " +
            "settled count is the requested cap rather than the delivered " +
            "rows.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint:
        "/johnvc/us-congress-financial-disclosures-and-stock-trading-data",
    request: {
        method: "POST",
        path:
            "/v2/acts/johnvc~us-congress-financial-disclosures-and-stock-trading-data/runs",
    },
    input: {
        schema: {
            body: zUsCongressFinancialDisclosuresAndStockTradingDataBody.extend(
                {
                    // the limiting knob at the actor's VERIFIED published
                    // default (100) so the estimate is deducible (D25)
                    Max_Results:
                        zUsCongressFinancialDisclosuresAndStockTradingDataBody
                            .shape.Max_Results
                            .unwrap().default(100),
                },
            ),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: {
        schema: zUsCongressFinancialDisclosuresAndStockTradingDataOutput,
    },
    usage: {
        /** The WHOLE published card (design D29): every charge event the
         *  actor publishes is a line, ids normalize from the event names
         *  (D28), amounts are the Business-tier rates. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                setup: {
                    kind: UsageModelKind.PER_CALL,
                    label: "setup fee",
                    // vendor charge event: "setup"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.001 },
                },
                transaction_processed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "transactions",
                    description: "charged for Max_Results records up front",
                    // vendor charge event: "transaction_processed"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.001629 },
                },
                default_dataset_item: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "stored rows",
                    description:
                        "the platform's per-row dataset charge — every pushed " +
                        "row, error rows included",
                    // vendor charge event: "apify-default-dataset-item"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00001 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    transaction_processed: body.Max_Results,
                    default_dataset_item: body.Max_Results,
                },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            // pre-charged from the input cap (money follows the charge)
            const charged = utils.json.optionalNum(body, "$.Max_Results") ??
                rows.length;
            return {
                counts: {
                    transaction_processed: charged,
                    default_dataset_item: rows.length,
                },
            };
        },
    },
});
