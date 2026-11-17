import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinktreeProfilesBody } from "./schema/inputs.ts";

/**
 * Mindcase `linktree/profiles`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Linktree Profiles",
        summary:
            "Linktree profiles with username, display name, bio, profile " +
            "picture and verified flag. Pass the profiles to look up.",
        description:
            "Linktree profiles with username, display name, bio, profile " +
            "picture and verified flag. Pass the profiles to look up. " +
            "Returns one row per profile with profileUrl, linktreeId, " +
            "username, displayName, bio, profilePicture, verified, " +
            "accountCreated, links, socialLinks. $0.0025 per profile; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/linktree/profiles",
        categories: ["social-media"],
    },
    endpoint: "/linktree/profiles",
    request: { method: "POST", path: "/v1/data/linktree/profiles/run" },
    input: {
        schema: {
            body: zLinktreeProfilesBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.profiles.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
