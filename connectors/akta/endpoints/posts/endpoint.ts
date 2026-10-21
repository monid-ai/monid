import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPostsQueryParams } from "./schema/inputs.ts";

/** GET /v1/company/posts — a company's social posts with engagement. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Social Posts",
        summary: "A company's LinkedIn posts with engagement metrics.",
        description: "List the social posts a company published, by " +
            "website or Akta uuid: post text, date, URL, content type, " +
            "paid and repost flags, an AI-classified theme, mentioned " +
            "companies, and engagement metrics such as reactions, comments, " +
            "and reposts. Use it to catch first-party announcements and " +
            "product or hiring signals.",
        docsUrl:
            "https://agent-docs.akta.pro/api-reference/alternative-data/social-posts",
        categories: ["company-news", "linkedin"],
        notes: [
            "Billed at 1 credit per started block of 10 posts.",
        ],
    },
    request: { method: "GET", path: "/v1/company/posts/" },
    // `limit` REQUIRED at the binding (design D25): the estimate's basis.
    input: {
        schema: { queryParams: zPostsQueryParams.required({ limit: true }) },
    },
    usage: {
        /** "1 credit for 10 records" (agent-docs pricing, "Social Posts").
         *  Settle is inherited from the provider, as on jobs. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "posts",
            every: 10,
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.queryParams.limit },
        }),
    },
});
