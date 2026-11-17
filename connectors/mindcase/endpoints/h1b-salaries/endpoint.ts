import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zH1bSalariesBody } from "./schema/inputs.ts";

/**
 * Mindcase `h1b/salaries`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "H1B Salaries",
        summary: "H1B salary filings with employer, job title, base salary, " +
            "city, state and submit date. Search by employer, job title " +
            "or city.",
        description:
            "H1B salary filings with employer, job title, base salary, " +
            "city, state and submit date. Search by employer, job title " +
            "or city. Returns one row per salarie with caseNumber, " +
            "companyName, jobTitle, baseSalary, city, state, submitDate, " +
            "startDate, caseStatus. For live job postings use " +
            "mindcase#linkedin/jobs. $0.0075 per salarie; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/h1b/salaries",
        categories: ["jobs", "government-data"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/h1b/salaries",
    request: { method: "POST", path: "/v1/data/h1b/salaries/run" },
    input: {
        schema: {
            body: zH1bSalariesBody.extend({
                maxResults: zH1bSalariesBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many salaries to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0075 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
