import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zProfileId, zSetupSessionId } from "../../schema/profiles.ts";

/**
 * `/browser-profiles/setup-save` — capture a running setup session's
 * cookies and storage into a profile you own
 * (`POST /v1/profiles/{id}/save` with `{session_id}`). The vendor's save
 * summary relays as-is: it describes the caller's OWN capture.
 */
export const zSetupSaveBody = z.object({
    profileId: zProfileId,
    sessionId: zSetupSessionId,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Save Profile Login Session",
        summary: "Save a setup browser's logged-in state into your browser " +
            "profile.",
        description: "Capture the cookies, local storage, and session " +
            "storage from a running setup session into a browser profile " +
            "YOU OWN. Returns the save summary: domains_updated, " +
            "domains_failed, cookie_count, pages_captured, and per-kind " +
            "skip buckets. Call it before the setup session's expires_at — " +
            "expired or cancelled sessions answer 409 and nothing is saved. " +
            "Free.",
        docsUrl: "https://docs.tinyfish.ai/agent-api/browser-context-profiles",
        categories: ["agents"],
    },
    endpoint: "/browser-profiles/setup-save",
    request: { method: "POST", path: "/v1/profiles/{id}/save" },
    input: {
        schema: { body: zSetupSaveBody },
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
