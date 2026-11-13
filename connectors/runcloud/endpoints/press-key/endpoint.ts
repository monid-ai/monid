import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSessionPathParams } from "../../schema/common.ts";
import { zPressKeyBody } from "./schema/inputs.ts";

/** /press-key — one hardware-keyboard key, optionally with modifiers
 *  (`POST .../interactions`, action `pressKey`). */
export default defineEndpoint({
    meta: {
        displayName: "Press Key on Simulator",
        summary:
            "Press one keyboard key (Enter, Backspace, arrows, shortcuts) on a simulator.",
        description:
            "Press one hardware keyboard key on one of YOUR sessions, " +
            "optionally with shift, control, alt or meta held: enter to " +
            "submit a form, backspace to delete, arrows to move, meta+a to " +
            "select all. Android has no capsLock, numLock or scrollLock " +
            "key. For ordinary text use /type-text; for Home, Back or " +
            "volume use /press-button. Free.",
        categories: ["mobile-simulators"],
    },
    endpoint: "/press-key",
    request: {
        method: "POST",
        path: "/run-cloud/{platform}/{sessionId}/interactions",
    },
    input: {
        schema: { pathParams: zSessionPathParams, body: zPressKeyBody },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                action: "pressKey",
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
