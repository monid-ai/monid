import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSessionPathParams } from "../../schema/common.ts";

/**
 * /stop-session — release a session NOW
 * (`DELETE /run-cloud/{platform}/{sessionId}`), the RELEASES anchor.
 *
 * Unlike saperly's prepaid number (whose release waits for the
 * paid-through date and makes no upstream call), a session meters until it
 * is released, so the run itself issues the DELETE and the meter stops at
 * once. The success settle still emits the `releases` mark: the host stops
 * tracking the session and runs `lifecycle.release`, which is idempotent
 * against a session already gone, then reads the final meter.
 */
export default defineEndpoint({
    meta: {
        displayName: "Stop Simulator Session",
        summary:
            "Stop one of your simulator sessions now; the meter ends immediately.",
        description:
            "Release one of YOUR simulator sessions. Metering stops at " +
            "once, the device and everything on it (installed apps, app " +
            "state, unsaved data) is gone, and the sessionId stops " +
            "working. Returns the session with status `released` and its " +
            "releasedAt. Call it whenever you are done; sessions also stop " +
            "on their own at their idle and hard timeouts.",
        categories: ["mobile-simulators"],
        notes: [
            "A 503 `simulator_release_pending` means run.cloud already " +
            "stopped billing but is still returning the device; retrying " +
            "is safe.",
        ],
    },
    endpoint: "/stop-session",
    request: { method: "DELETE", path: "/run-cloud/{platform}/{sessionId}" },
    input: { schema: { pathParams: zSessionPathParams } },
    resources: {
        releases: [{
            id: "runcloud/simulator-session",
            key: "$.pathParams.sessionId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
