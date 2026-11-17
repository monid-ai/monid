import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPfInfoEstablishmentBody } from "./schema/inputs.ts";

/**
 * Mindcase `pf-info/establishment`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "EPFO Establishment",
        summary: "The full public EPFO record for an Indian establishment: " +
            "registration, coverage and exemption status, owners and " +
            "directors, the statutory identifiers (CIN...",
        description:
            "The full public EPFO record for an Indian establishment: " +
            "registration, coverage and exemption status, owners and " +
            "directors, the statutory identifiers (CIN, LIN, ESIC), the " +
            "EPFO office it belongs to, and the monthly PF remittance " +
            "history with amount and employee count per wage month. " +
            "Returns one row per establishment with establishmentId, " +
            "establishmentName, nameAsPerPan, establishmentStatus, " +
            "workingStatus, ecrRegistrationStatus, postCoverageStatus, " +
            "exemptionStatus, coverageSection, actionableStatus, " +
            "dateOfCoverage, dateOfSetup, primaryBusinessActivity, " +
            "sectionApplicable, ownershipType, panStatus, address, " +
            "pinCode, city, district, state, country, epfoOfficeName, " +
            "epfoOfficeAddress, cin, lin, esicCode, startupOrderNo, " +
            "msmeOrderNo, lastUpdatedOn and 4 more fields. One or more " +
            "full EPFO establishment ids. To find the establishment id by " +
            "name use mindcase#pf-info/listing; for the MCA company " +
            "record use mindcase#mca/company. $0.05 per establishment; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/pf-info/establishment",
        categories: ["government-data", "company-enrichment"],
        notes: [
            "Bills one row per input looked up; `maxResults` (optional) " +
            "only stops the run early.",
        ],
    },
    endpoint: "/pf-info/establishment",
    request: { method: "POST", path: "/v1/data/pf-info/establishment/run" },
    input: {
        schema: {
            body: zPfInfoEstablishmentBody.extend({
                maxResults: zPfInfoEstablishmentBody.shape.maxResults.unwrap()
                    .min(1).optional().describe(
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
            const capped = body.est_ids.length;
            const rows = Math.min(body.maxResults ?? Infinity, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
