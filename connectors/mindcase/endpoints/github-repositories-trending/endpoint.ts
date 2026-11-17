import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGithubRepositoriesTrendingBody } from "./schema/inputs.ts";

/**
 * Mindcase `github/repositories-trending`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "GitHub Repositories Trending",
        summary: "Trending GitHub repositories with rank, description, " +
            "language, stars and forks. Filter by language and daily, " +
            "weekly or monthly period.",
        description: "Trending GitHub repositories with rank, description, " +
            "language, stars and forks. Filter by language and daily, " +
            "weekly or monthly period. Returns one row per repositorie " +
            "with repository, url, rank, description, language, stars, " +
            "forks, starsGained, topics, license, lastPushedAt. To search " +
            "all repositories by keyword use " +
            "mindcase#github/repositories. $0.0015 per repositorie; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/github/repositories-trending",
        categories: ["web-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/github/repositories-trending",
    request: {
        method: "POST",
        path: "/v1/data/github/repositories-trending/run",
    },
    input: {
        schema: {
            body: zGithubRepositoriesTrendingBody.extend({
                maxResults: zGithubRepositoriesTrendingBody.shape.maxResults
                    .unwrap().min(1).default(25).describe(
                        "How many repositories to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0015 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
