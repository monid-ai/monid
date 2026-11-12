import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSessionPathParams } from "../../schema/common.ts";
import { zTypeTextBody } from "./schema/inputs.ts";

/** /type-text — hardware-keyboard typing into the focused field
 *  (`POST .../interactions`, action `typeText`). */
export default defineEndpoint({
    meta: {
        displayName: "Type Text on Simulator",
        summary: "Type text into the focused field on a simulator.",
        description:
            "Type text into the focused field of one of YOUR sessions, as " +
            "if on a hardware keyboard. /tap the field first. Printable US " +
            "ASCII, tab and newline only, up to 10000 characters; for " +
            "Enter, Backspace, arrows or shortcuts use /press-key. Free.",
        categories: ["mobile-simulators"],
    },
    endpoint: "/type-text",
    request: {
        method: "POST",
        path: "/run-cloud/{platform}/{sessionId}/interactions",
    },
    input: {
        schema: { pathParams: zSessionPathParams, body: zTypeTextBody },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                action: "typeText",
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
