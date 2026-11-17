import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSnapchatProfilesBody } from "./schema/inputs.ts";

/**
 * Mindcase `snapchat/profiles`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Snapchat Profiles",
        summary:
            "Snapchat public profiles with display name, bio, subscriber " +
            "count, website and verified flag. Pass the usernames.",
        description:
            "Snapchat public profiles with display name, bio, subscriber " +
            "count, website and verified flag. Pass the usernames. " +
            "Returns one row per profile with profileUrl, username, " +
            "displayName, bio, subscribers, website, verified, " +
            "accountType, category, subcategory, location, " +
            "profilePicture, coverImage, snapcode, hasHighlights, " +
            "hasSpotlight, relatedAccounts, accountCreated, lastUpdated, " +
            "businessProfileId. $0.003 per profile; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/snapchat/profiles",
        categories: ["snapchat"],
    },
    endpoint: "/snapchat/profiles",
    request: { method: "POST", path: "/v1/data/snapchat/profiles/run" },
    input: {
        schema: {
            body: zSnapchatProfilesBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.003 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.usernames.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
