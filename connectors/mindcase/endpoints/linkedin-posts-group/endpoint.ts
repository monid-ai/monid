import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinPostsGroupBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/posts-group`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Posts Group",
        summary: "Posts from LinkedIn groups with post text, author name and " +
            "author URL. Pass the group URLs.",
        description:
            "Posts from LinkedIn groups with post text, author name and " +
            "author URL. Pass the group URLs. Returns one row per post " +
            "with postUrl, postId, groupId, groupUrl, postText, " +
            "authorName, authorUrl, authorProfileId, authorHandle, " +
            "authorAvatar, authorType, authorHeadline, reactions, " +
            "comments, shares, reactionTypes, postedDate, isPinned, " +
            "articleUrl, postMediaUrl, postMediaType, job, repost, " +
            "mentions. For posts from profiles and companies use " +
            "mindcase#linkedin/posts. $0.008 per post; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/posts-group",
        categories: ["linkedin"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/linkedin/posts-group",
    request: { method: "POST", path: "/v1/data/linkedin/posts-group/run" },
    input: {
        schema: {
            body: zLinkedinPostsGroupBody.extend({
                maxResults: zLinkedinPostsGroupBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many posts to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.008 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
