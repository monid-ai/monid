import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSessionPathParams } from "../../schema/common.ts";

/**
 * /get-session — one owned session, live from upstream
 * (`GET /run-cloud/{platform}/{sessionId}`). READS + key: the engine's
 * pre-gate answers the uniform 404 for a foreign or unknown id before
 * anything executes.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Simulator Session",
        summary:
            "Check whether one of your simulator sessions is still running, and when it expires.",
        description:
            "Read one of YOUR simulator sessions live: status (active, " +
            "released or failed), platform, device model and OS version, " +
            "the idle timeout, createdAt / releasedAt / expiresAt, and the " +
            "signed live-viewer `url`. Use it to check that a session is " +
            "still running before driving it, or to find out why it " +
            "stopped. Free.",
        categories: ["mobile-simulators"],
    },
    endpoint: "/get-session",
    request: { method: "GET", path: "/run-cloud/{platform}/{sessionId}" },
    input: { schema: { pathParams: zSessionPathParams } },
    resources: {
        reads: [{
            id: "runcloud/simulator-session",
            key: "$.pathParams.sessionId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
