import { defineProvider, presets } from "@shared/core";

/**
 * run.cloud — cloud iOS simulators and Android emulators for agents
 * (https://api.run.cloud). Source of truth for every route, body and
 * response shape: the published TypeScript SDK (`@run-cloud/sdk`,
 * `SimulatorClient`) and https://docs.run.cloud.
 *
 * Bearer-key REST on ONE pooled Monid account, the saperly posture: a
 * simulator session is an OWNED resource (`runcloud/simulator-session`),
 * every session-scoped endpoint gates the session id against the
 * workspace's ownership window, and no endpoint lists the pooled account.
 *
 * RATE CARD (https://run.cloud/pricing, read 2026-11-12): $0.02 per active
 * minute for iOS simulators and Android emulators alike, metered per second
 * from create until release or timeout. Every control call is free; the
 * whole cost is the session's active time, settled by the resource's
 * `reconcileUsage`.
 */
export default defineProvider({
    name: "runcloud",
    meta: {
        displayName: "run.cloud",
        summary:
            "Cloud iOS simulators and Android emulators an agent can start, drive and read.",
        description:
            "run.cloud gives an agent a real iOS simulator or Android " +
            "emulator in the cloud: start a session (optionally installing " +
            "an uploaded app), tap, swipe, type, press keys and hardware " +
            "buttons, open URLs and deep links, read the screen's " +
            "accessibility tree and the device logs, then stop it. Use it " +
            "to smoke-test a mobile app, reproduce a bug, or check a flow " +
            "end to end. Sessions are workspace-OWNED resources metered at " +
            "$0.02 per active minute, and they stop on their own after an " +
            "idle and a hard timeout.",
        homepageUrl: "https://run.cloud",
        docsUrl: "https://docs.run.cloud",
        categories: ["mobile-simulators"],
        notes: [
            "Sessions are OWNED RESOURCES: session-scoped endpoints only " +
            "operate on sessions this workspace started; a foreign or " +
            "unknown sessionId is a uniform 404.",
            "Every session endpoint takes the `platform` and `sessionId` " +
            "that /start-session returned, as path parameters; a " +
            "mismatched platform answers 404.",
            "Screen coordinates are normalized: x and y run from 0 " +
            "(left/top) to 1 (right/bottom). /read-screen returns each " +
            "element's normalized `center`, ready for /tap.",
            "An interaction acknowledgement confirms dispatch, not that " +
            "the screen finished rendering; read the screen again if it " +
            "is still transitioning.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.run.cloud" },
    output: {
        // Monid's pooled org id and the fleet lease plumbing never reach
        // a workspace, on success or error (deep omit).
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, [
                "orgId",
                "leaseId",
                "device",
                "hostId",
            ]),
        fromError: ({ data, utils }) =>
            utils.json.omit(data.output, [
                "orgId",
                "leaseId",
                "device",
                "hostId",
            ]),
    },
});
