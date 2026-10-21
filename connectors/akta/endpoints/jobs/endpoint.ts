import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zJobsQueryParams } from "./schema/inputs.ts";

/** GET /v1/company/jobs — a company's live job posts. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Job Posts",
        summary: "A company's job posts from LinkedIn, Indeed, and others.",
        description: "List a company's live job posts by website or Akta " +
            "uuid, sourced from LinkedIn, Indeed, and others: title, " +
            "location, date, URL, AI-written description, employment type, " +
            "remote flag, disclosed salary, experience requirements, " +
            "extracted skills, and the total count of open roles. Use it for " +
            "hiring and buying-intent signals or team-expansion research.",
        docsUrl:
            "https://agent-docs.akta.pro/api-reference/alternative-data/job-posts",
        categories: ["jobs", "company-enrichment"],
        notes: [
            "Billed at 4 credits per started block of 10 job posts.",
        ],
    },
    request: { method: "GET", path: "/v1/company/jobs/" },
    // `limit` REQUIRED at the binding (design D25): it is the estimate's
    // whole basis, so the caller states it.
    input: {
        schema: { queryParams: zJobsQueryParams.required({ limit: true }) },
    },
    usage: {
        /** Job posts are the quantity; "4 credits for 10 records" (agent-docs
         *  pricing, "Job Posting") is `every: 10` × 4 credits. Settle is
         *  inherited: the provider evidence counts the delivered `data`
         *  array and the provider consolidate lifts the vendor's claim. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "job posts",
            every: 10,
            consumes: { credit: "default", amount: 4 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.queryParams.limit },
        }),
    },
});
