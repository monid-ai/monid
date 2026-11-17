import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYcombinatorCompaniesBody } from "./schema/inputs.ts";

/**
 * Mindcase `ycombinator/companies`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Y Combinator Companies",
        summary: "Every company in Y Combinator's public directory - batch, " +
            "industry, region, team size, status, founders with bios and " +
            "LinkedIn URLs, open roles, news and...",
        description:
            "Every company in Y Combinator's public directory - batch, " +
            "industry, region, team size, status, founders with bios and " +
            "LinkedIn URLs, open roles, news and launches. Filter the " +
            "directory, or look up companies by URL or slug. Returns one " +
            "row per companie with id, name, slug, formerNames, " +
            "smallLogoThumbUrl, website, allLocations, longDescription, " +
            "oneLiner, teamSize, industry, subindustry, launchedAt, tags, " +
            "tagsHighlighted, topCompany, isHiring, nonprofit, batch, " +
            "status, industries, regions, stage, appVideoPublic, " +
            "demoDayVideoPublic, appAnswers, questionAnswers, batchName, " +
            "smallLogoUrl, ycdcStatus and 30 more fields. Filter the " +
            "directory by batch, industry, region, tag, status or " +
            "keyword, or pass company page URLs (or bare slugs) to look " +
            "up specific companies. $0.01 per companie; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/ycombinator/companies",
        categories: ["company-enrichment", "funding-data"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "Requires Pass a filter (batch, industry, region, ...), a " +
            "keyword, companies URLs, or just maxResults to take the top " +
            "of the directory.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/ycombinator/companies",
    request: { method: "POST", path: "/v1/data/ycombinator/companies/run" },
    input: {
        schema: {
            body: zYcombinatorCompaniesBody.extend({
                maxResults: zYcombinatorCompaniesBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Stop after this many companies. Each one costs a row, so this caps the bill as well as the output. Required, at least 1.",
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
