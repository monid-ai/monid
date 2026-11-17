import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGstInfoTaxpayerBody } from "./schema/inputs.ts";

/**
 * Mindcase `gst-info/taxpayer`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "GST Taxpayer",
        summary: "The full public GST record for any Indian GSTIN: the " +
            "registration snapshot (legal and trade name, address, " +
            "status, constitution, jurisdiction, Aadhaar and...",
        description: "The full public GST record for any Indian GSTIN: the " +
            "registration snapshot (legal and trade name, address, " +
            "status, constitution, jurisdiction, Aadhaar and e-KYC " +
            "flags), plus the nested return-filing history, HSN goods and " +
            "SAC services, filing frequency by financial year, and " +
            "additional trade names. Returns one row per taxpayer with " +
            "gstin, legalName, tradeName, registrationStatus, " +
            "taxpayerType, constitutionOfBusiness, businessNatureCode, " +
            "registrationDate, cancellationDate, " +
            "principalPlaceOfBusiness, natureOfBusinessActivities, " +
            "stateJurisdiction, centreJurisdiction, aadhaarVerified, " +
            "aadhaarVerificationDate, eKycVerified, eKycVerificationDate, " +
            "eInvoiceEnabled, compositionRate, fieldVisitConducted, " +
            "financialYears, hsnGoods, sacServices, returnFilings, " +
            "filingPreferences, additionalTradeNames, scrapedAt. One or " +
            "more 15-character GSTINs. $0.05 per taxpayer; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/gst-info/taxpayer",
        categories: ["government-data", "company-enrichment"],
        notes: [
            "Bills one row per input looked up; `maxResults` (optional) " +
            "only stops the run early.",
        ],
    },
    endpoint: "/gst-info/taxpayer",
    request: { method: "POST", path: "/v1/data/gst-info/taxpayer/run" },
    input: {
        schema: {
            body: zGstInfoTaxpayerBody.extend({
                maxResults: zGstInfoTaxpayerBody.shape.maxResults.unwrap().min(
                    1,
                ).optional().describe(
                    "Stop after this many have been looked up. Each one costs a row, so this caps the bill as well as the output.",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.05 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.gstins.length;
            const rows = Math.min(body.maxResults ?? Infinity, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
