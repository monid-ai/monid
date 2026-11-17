import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zThreadsProfilesBody } from "./schema/inputs.ts";

/**
 * Mindcase `threads/profiles`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Threads Profiles",
        summary:
            "Look up Threads profile details such as follower count, bio " +
            "and verification status for a list of usernames.",
        description:
            "Look up Threads profile details such as follower count, bio " +
            "and verification status for a list of usernames. Returns one " +
            "row per profile with profileUrl, username, name, bio, " +
            "followers, verified, private, bioLinks, query. For their " +
            "posts use mindcase#threads/posts. $0.008 per profile; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/threads/profiles",
        categories: ["social-media"],
    },
    endpoint: "/threads/profiles",
    request: { method: "POST", path: "/v1/data/threads/profiles/run" },
    input: {
        schema: {
            body: zThreadsProfilesBody,
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
            const capped = body.usernames.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
