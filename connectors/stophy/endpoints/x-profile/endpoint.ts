import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zXProfileBody } from "./schema/inputs.ts";

/**
 * `POST /v1/x/profile` — one public X profile. Flat 1 unit per call ⇒ leaf
 * PER_CALL; a profile that does not exist is a vendor non-2xx, which the
 * engine zero-bills.
 */
export default defineEndpoint({
    meta: {
        displayName: "Stophy X Profile",
        summary: "A public X (Twitter) profile.",
        description: "Get a public X profile: `userId`, `username`, " +
            "`name`, `bio`, `location`, `website`, `joinedAt`, " +
            "`followers`, `following`, `posts`, `isVerified`, " +
            "`isProtected`, `avatarUrl` and `bannerUrl`. Send " +
            "`profileUrl` or `username`, not both.",
        docsUrl: "https://docs.stophy.dev/api-reference/endpoint/x-profile",
        categories: ["twitter"],
        notes: ["1 Stophy call per profile returned."],
    },
    request: { method: "POST", path: "/x/profile" },
    input: {
        schema: {
            body: z.union([
                zXProfileBody.omit({ username: true })
                    .required({ profileUrl: true }),
                zXProfileBody.omit({ profileUrl: true })
                    .required({ username: true }),
            ]),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "profiles",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
