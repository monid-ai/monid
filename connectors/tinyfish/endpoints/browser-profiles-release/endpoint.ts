import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zProfileId } from "../../schema/profiles.ts";

/**
 * `/browser-profiles/release` — delete a browser profile you own. The run
 * makes NO upstream call (the single-owner rule): the RELEASES binding
 * pre-gates ownership, a success settle marks the instance released, and
 * the HOST executes the resource doc's `lifecycle.release` (the
 * `DELETE /v1/profiles/{id}`) exactly once. A profile has no billing
 * period, so nothing is held back.
 */
export const zProfileReleaseBody = z.object({
    profileId: zProfileId,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Delete Browser Profile",
        summary: "Delete a browser profile you own and its saved login state.",
        description:
            "Delete a browser profile you own: its saved cookies and " +
            "storage are discarded upstream and future agent runs can no " +
            "longer attach it. Pass the profile id as 'profileId'.",
        docsUrl: "https://docs.tinyfish.ai/agent-api/browser-context-profiles",
        categories: ["agents"],
    },
    endpoint: "/browser-profiles/release",
    /** The real upstream route — documentation + the substituted anchor;
     *  the start below never calls it (the host's release does). */
    request: { method: "DELETE", path: "/v1/profiles/{id}" },
    input: {
        schema: { body: zProfileReleaseBody },
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                id: String(
                    (data.input.body as Record<string, Json>).profileId,
                ),
            },
        }),
    },
    resources: {
        releases: [{
            id: "tinyfish/browser-profile",
            key: "$.body.profileId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        /** LOCAL ack — the release itself is the settle mark's job. */
        // deno-lint-ignore require-await
        start: async ({ data }) => ({
            kind: "COMPLETED",
            httpStatus: 202,
            output: {
                profileId: data.input.body!.profileId,
                status: "release_requested",
                note: "The profile is being deleted upstream.",
            },
        }),
    },
});
