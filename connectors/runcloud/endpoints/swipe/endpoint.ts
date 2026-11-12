import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSessionPathParams } from "../../schema/common.ts";
import { zSwipeBody } from "./schema/inputs.ts";

/** /swipe — a one-finger swipe between two normalized points
 *  (`POST .../interactions`, action `swipe`). */
export default defineEndpoint({
    meta: {
        displayName: "Swipe on Simulator",
        summary: "Swipe one finger between two points on a simulator's screen.",
        description:
            "Swipe one finger across one of YOUR sessions' screens, from " +
            "one normalized point to another (x and y from 0 to 1). " +
            "Swiping UP (from y 0.75 to y 0.25) scrolls content down. " +
            "Use it to scroll lists, page through onboarding, or dismiss " +
            "sheets. Free.",
        categories: ["mobile-simulators"],
    },
    endpoint: "/swipe",
    request: {
        method: "POST",
        path: "/run-cloud/{platform}/{sessionId}/interactions",
    },
    input: {
        schema: { pathParams: zSessionPathParams, body: zSwipeBody },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, { action: "swipe" }),
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
