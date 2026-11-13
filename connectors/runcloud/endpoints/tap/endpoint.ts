import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPoint, zSessionPathParams } from "../../schema/common.ts";

/**
 * /tap — one tap at a normalized point
 * (`POST /run-cloud/{platform}/{sessionId}/interactions`, action `tap`).
 * The five interaction endpoints share the vendor route, so each declares
 * its own identity and stamps its `action` in toRequest.
 */
export default defineEndpoint({
    meta: {
        displayName: "Tap Simulator Screen",
        summary: "Tap a simulator's screen at a normalized x/y point.",
        description:
            "Tap one of YOUR sessions' screens once at a normalized point: " +
            "x and y run from 0 (left/top) to 1 (right/bottom). Get the " +
            "point from /read-screen, whose elements carry a ready-made " +
            "`center`. Returns the device's acknowledgement (status " +
            "completed, durationMs) once the tap was dispatched; read the " +
            "screen again to see its effect. Tap a text field before " +
            "/type-text. Free.",
        categories: ["mobile-simulators"],
    },
    endpoint: "/tap",
    request: {
        method: "POST",
        path: "/run-cloud/{platform}/{sessionId}/interactions",
    },
    input: {
        schema: { pathParams: zSessionPathParams, body: zPoint },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, { action: "tap" }),
        }),
    },
    resources: {
        uses: [{
            id: "runcloud/simulator-session",
            key: "$.pathParams.sessionId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
