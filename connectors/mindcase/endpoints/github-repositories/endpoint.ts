import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGithubRepositoriesBody } from "./schema/inputs.ts";

/**
 * Mindcase `github/repositories`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "GitHub Repositories",
        summary: "GitHub repositories with full name, description, URL, " +
            "homepage and owner. Search by keyword.",
        description: "GitHub repositories with full name, description, URL, " +
            "homepage and owner. Search by keyword. Returns one row per " +
            "repositorie with repoId, fullName, name, description, url, " +
            "homepage, owner, ownerType, stars, forks, openIssues, " +
            "language, topics, license, defaultBranch, sizeKb, isFork, " +
            "isArchived, createdAt, updatedAt, pushedAt. For what is " +
            "trending now use mindcase#github/repositories-trending. " +
            "$0.0015 per repositorie; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/github/repositories",
        categories: ["web-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/github/repositories",
    request: { method: "POST", path: "/v1/data/github/repositories/run" },
    input: {
        schema: {
            body: zGithubRepositoriesBody.extend({
                maxResults: zGithubRepositoriesBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
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
