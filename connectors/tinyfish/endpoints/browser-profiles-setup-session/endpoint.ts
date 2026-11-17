import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zProfileId } from "../../schema/profiles.ts";

/**
 * `/browser-profiles/setup-session` — open a TEMPORARY login browser for a
 * profile you own (`POST /v1/profiles/{id}/setup-session`). The `cdp_url`
 * rides in RUN OUTPUT on purpose: it is an ephemeral capability discarded
 * at `expires_at` (~15 min) and run reads are workspace-scoped, so there is
 * no persisted object to hang it on.
 */
export const zSetupSessionBody = z.object({
    profileId: zProfileId,
    targetUrl: z.string().min(1).optional().describe(
        "URL the setup browser opens on startup — typically the login " +
            "page. Example: https://app.example.com/login.",
    ),
    timeoutSeconds: z.number().int().min(60).max(3600).optional().describe(
        "Setup-session lifetime in seconds before unsaved state is " +
            "discarded. Example: 900.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Start Profile Login Session",
        summary: "Open a temporary browser to log into a site and save the " +
            "login into your browser profile.",
        description: "Start a temporary setup browser for a browser profile " +
            "YOU OWN: returns session_id, a cdp_url to drive with " +
            "Playwright or any CDP client (connectOverCDP), base_url for " +
            "session HTTP endpoints like /pages, and expires_at. Log into " +
            "the target site over cdp_url, then persist the cookies and " +
            "storage with /browser-profiles/setup-save (pass this " +
            "session_id), or discard them with /browser-profiles/" +
            "setup-cancel. Unsaved state is discarded at expires_at (about " +
            "15 minutes). Free.",
        docsUrl: "https://docs.tinyfish.ai/agent-api/browser-context-profiles",
        categories: ["agents"],
    },
    endpoint: "/browser-profiles/setup-session",
    request: { method: "POST", path: "/v1/profiles/{id}/setup-session" },
    input: {
        schema: { body: zSetupSessionBody },
        toRequest: ({ data }) => {
            const body = data.input.body as Record<string, Json>;
            return {
                ...data.input,
                pathParams: { id: String(body.profileId) },
                body: {
                    ...(body.targetUrl !== undefined
                        ? { url: body.targetUrl }
                        : {}),
                    ...(body.timeoutSeconds !== undefined
                        ? { timeout_seconds: body.timeoutSeconds }
                        : {}),
                },
            };
        },
    },
    timeouts: { requestMs: 60_000, runMs: 90_000 },
    resources: {
        reads: [{ id: "tinyfish/browser-profile", key: "$.body.profileId" }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.pick(data.output, [
                "$.session_id",
                "$.cdp_url",
                "$.base_url",
                "$.timeout_seconds",
                "$.expires_at",
            ]),
    },
});
