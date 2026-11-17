import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTwitterProfilesBody } from "./schema/inputs.ts";

/**
 * Mindcase `twitter/profiles`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Twitter / X Profiles",
        summary: "Twitter (X) profiles: bio, follower counts, verification " +
            "type, location and links. By handle, profile URL or keyword " +
            "search; same record either way.",
        description:
            "Twitter (X) profiles: bio, follower counts, verification " +
            "type, location and links. By handle, profile URL or keyword " +
            "search; same record either way. Returns one row per profile " +
            "with username, profileUrl, displayName, accountId, bio, " +
            "website, bioLinks, location, followers, following, tweets, " +
            "mediaPosts, likesGiven, blueVerified, verifiedType, " +
            "accountType, protected, accountCreated, openDms, " +
            "pinnedTweetUrl, profilePicture, coverImage. Call it by " +
            "handle / url (inputs) or search (searchTerms). For their " +
            "tweets use mindcase#twitter/tweets; for followers use " +
            "mindcase#twitter/followers. $0.0005 per profile; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/twitter/profiles",
        categories: ["twitter"],
        notes: [
            "`maxResults` does not apply to `inputs`: those return one " +
            "row per entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/twitter/profiles",
    request: { method: "POST", path: "/v1/data/twitter/profiles/run" },
    input: {
        schema: {
            body: zTwitterProfilesBody.extend({
                maxResults: zTwitterProfilesBody.shape.maxResults.unwrap().min(
                    1,
                ).describe(
                    "Number of accounts to return. Required, at least 1.",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.searchTerms ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.inputs?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
