import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSessionPathParams } from "../../schema/common.ts";
import { zPressButtonBody } from "./schema/inputs.ts";

/** /press-button — a physical device button
 *  (`POST .../interactions`, action `pressButton`). */
export default defineEndpoint({
    meta: {
        displayName: "Press Simulator Button",
        summary:
            "Press a device button (Home, Back, power, volume, app switcher) on a simulator.",
        description:
            "Press a physical button on one of YOUR sessions: home to " +
            "leave the app, back on Android, appSwitcher or recents, " +
            "power, volume up/down, and the side or action button. A " +
            "button the device does not have fails with " +
            "`unsupported_action`; report it instead of retrying. Hold it " +
            "longer with durationMs. Free.",
        categories: ["mobile-simulators"],
    },
    endpoint: "/press-button",
    request: {
        method: "POST",
        path: "/run-cloud/{platform}/{sessionId}/interactions",
    },
    input: {
        schema: { pathParams: zSessionPathParams, body: zPressButtonBody },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                action: "pressButton",
            }),
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
