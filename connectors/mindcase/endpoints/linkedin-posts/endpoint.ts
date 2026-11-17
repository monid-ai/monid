import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Posts",
        summary:
            "LinkedIn posts from any profile, company, post or feed URL, " +
            "or by search with author, mention and content-type filters. " +
            "Same clean record either way.",
        description:
            "LinkedIn posts from any profile, company, post or feed URL, " +
            "or by search with author, mention and content-type filters. " +
            "Same clean record either way. Returns one row per post with " +
            "postUrl, postId, postText, authorName, authorUrl, " +
            "authorProfileId, authorHandle, authorAvatar, authorType, " +
            "authorHeadline, authorFollowers, reactions, comments, " +
            "shares, postedDate, repostNote, articleUrl, postMediaUrl, " +
            "postMediaType, mentions. Call it by url (urls) or search " +
            "(queries). For the comments or reactions on a post use " +
            "mindcase#linkedin/post-comments or " +
            "mindcase#linkedin/post-reactions; for what a member " +
            "commented or reacted to elsewhere use " +
            "mindcase#linkedin/profile-comments or " +
            "mindcase#linkedin/profile-reactions. $0.002 per post; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/posts",
        categories: ["linkedin"],
        notes: [
            "`maxResults` does not apply to `urls` / `queries`: those " +
            "return one row per entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/linkedin/posts",
    request: { method: "POST", path: "/v1/data/linkedin/posts/run" },
    input: {
        schema: {
            body: zLinkedinPostsBody.extend({
                maxResults: zLinkedinPostsBody.shape.maxResults.unwrap().min(1)
                    .describe("Posts to return. Required, at least 1."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = 0;
            const uncapped =
                (body.urls ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length +
                (body.queries ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
