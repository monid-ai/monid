import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zYcombinatorFoundersDatasetBody } from "./schema/inputs.ts";

/**
 * Mindcase `ycombinator/founders-dataset`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Y Combinator Founders Dataset with Emails",
        summary:
            "Every Y Combinator founder from 2020 to Fall 2026 batches in " +
            "one run, free: name, title, work email, company, batch, " +
            "one-liner, industry, location, status...",
        description:
            "Every Y Combinator founder from 2020 to Fall 2026 batches in " +
            "one run, free: name, title, work email, company, batch, " +
            "one-liner, industry, location, status, LinkedIn, Twitter and " +
            "website. Returns one row per founder with urlSlug, fullName, " +
            "title, currentCompany, email, companyBatch, " +
            "companyBatchName, companyOneLiner, ycParentIndustries, " +
            "companyTeamSize, companyLocation, companyCountry, " +
            "companyYcdcStatus, linkedinUrl, twitterUrl, companyWebsite, " +
            "companyLinkedinUrl, ycUrl, companyUrl. No input needed. " +
            "Optionally narrow to one batch. For live founder profiles " +
            "from any batch use mindcase#ycombinator/founders; for " +
            "company records use mindcase#ycombinator/companies. Free.",
        docsUrl: "https://docs.mindcase.co/apis/ycombinator/founders-dataset",
        categories: ["people-enrichment", "funding-data"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/ycombinator/founders-dataset",
    request: {
        method: "POST",
        path: "/v1/data/ycombinator/founders-dataset/run",
    },
    input: {
        schema: {
            body: zYcombinatorFoundersDatasetBody.extend({
                maxResults: zYcombinatorFoundersDatasetBody.shape.maxResults
                    .unwrap().min(1).optional().describe(
                        "Stop after this many founders.",
                    ),
            }),
        },
    },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data, utils }) => ({
            credits: {},
            output: utils.json.pluck(data.output, "$.usd_used").rest,
        }),
    },
});
