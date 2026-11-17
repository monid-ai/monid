import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMcaDirectorBody } from "./schema/inputs.ts";

/**
 * Mindcase `mca/director`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "MCA Director",
        summary:
            "The public MCA record for an Indian company director by DIN: " +
            "their name, contact details on file, and every board they " +
            "sit on, each with the company's CIN...",
        description:
            "The public MCA record for an Indian company director by DIN: " +
            "their name, contact details on file, and every board they " +
            "sit on, each with the company's CIN, name, status, state, " +
            "their designation and appointment date. Returns one row per " +
            "director with din, name, mobile, email, companiesCount, " +
            "companies, highVolume. One or more 8-digit DINs. For the " +
            "full company record use mindcase#mca/company; for its " +
            "financials use mindcase#mca/company-financials. $0.05 per " +
            "director; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/mca/director",
        categories: ["government-data", "people-enrichment"],
        notes: [
            "Bills one row per input looked up; `maxResults` (optional) " +
            "only stops the run early.",
        ],
    },
    endpoint: "/mca/director",
    request: { method: "POST", path: "/v1/data/mca/director/run" },
    input: {
        schema: {
            body: zMcaDirectorBody.extend({
                maxResults: zMcaDirectorBody.shape.maxResults.unwrap().min(1)
                    .optional().describe(
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
            const capped = body.queries.length;
            const rows = Math.min(body.maxResults ?? Infinity, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
