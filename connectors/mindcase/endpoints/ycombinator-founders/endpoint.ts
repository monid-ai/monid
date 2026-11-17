import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYcombinatorFoundersBody } from "./schema/inputs.ts";

/**
 * Mindcase `ycombinator/founders`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Y Combinator Founders",
        summary: "Every founder in Y Combinator's public directory - name, " +
            "title, bio, LinkedIn, Twitter and Hacker News, plus the " +
            "company they founded with its batch...",
        description:
            "Every founder in Y Combinator's public directory - name, " +
            "title, bio, LinkedIn, Twitter and Hacker News, plus the " +
            "company they founded with its batch, industry, location and " +
            "team size. Returns one row per founder with id, firstName, " +
            "lastName, hnId, avatarThumb, currentCompany, currentTitle, " +
            "companySlug, topCompany, urlSlug, allCompaniesText, " +
            "ycIndustries, ycParentIndustries, ycSubindustries, " +
            "currentRegion, ycTitles, batches, isActive, founderBio, " +
            "fullName, title, twitterUrl, linkedinUrl, hasEmail, " +
            "latestYcCompany, ycUrl, hnUrl, companyUrl, role, " +
            "companyBatch and 9 more fields. Filter by batch, founder " +
            "title, industry, region or keyword. The URL mode takes " +
            "founder slugs returned by a previous run. The whole 2020+ " +
            "founder list with emails is free in one call via " +
            "mindcase#ycombinator/founders-dataset. $0.01 per founder; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/ycombinator/founders",
        categories: ["people-enrichment", "funding-data"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "Requires Pass a filter (batch, industry, region, ...), a " +
            "keyword, founders URLs, or just maxResults to take the top " +
            "of the directory.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/ycombinator/founders",
    request: { method: "POST", path: "/v1/data/ycombinator/founders/run" },
    input: {
        schema: {
            body: zYcombinatorFoundersBody.extend({
                maxResults: zYcombinatorFoundersBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Stop after this many founders. Each one costs a row, so this caps the bill as well as the output. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = 0;
            const uncapped = body.urls?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
