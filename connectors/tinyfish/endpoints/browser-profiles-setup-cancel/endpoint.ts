import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zProfileId, zSetupSessionId } from "../../schema/profiles.ts";

/**
 * `/browser-profiles/setup-cancel` — end a running setup browser WITHOUT
 * saving (`POST /v1/profiles/{id}/setup-session/cancel` with
 * `{session_id}`): the explicit early version of what `expires_at` does on
 * its own.
 */
export const zSetupCancelBody = z.object({
    profileId: zProfileId,
    sessionId: zSetupSessionId,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Cancel Profile Login Session",
        summary: "Close a setup browser without saving its login state.",
        description: "Cancel a running setup session for a browser profile " +
            "YOU OWN: the temporary browser is closed and any unsaved " +
            "cookies and storage are discarded (nothing already saved to " +
            "the profile is touched). An expired or already-cancelled " +
            "session answers 409 or 404 — safe to ignore. Free.",
        docsUrl: "https://docs.tinyfish.ai/agent-api/browser-context-profiles",
        categories: ["agents"],
    },
    endpoint: "/browser-profiles/setup-cancel",
    request: {
        method: "POST",
        path: "/v1/profiles/{id}/setup-session/cancel",
    },
    input: {
        schema: { body: zSetupCancelBody },
        toRequest: ({ data }) => {
            const body = data.input.body as Record<string, Json>;
            return {
                ...data.input,
                pathParams: { id: String(body.profileId) },
                body: { session_id: body.sessionId },
            };
        },
    },
    resources: {
        reads: [{ id: "tinyfish/browser-profile", key: "$.body.profileId" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
