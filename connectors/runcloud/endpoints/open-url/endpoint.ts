import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSessionPathParams } from "../../schema/common.ts";
import { zOpenUrlBody } from "./schema/inputs.ts";

/** /open-url — dispatch a URL or deep link on the device
 *  (`POST /run-cloud/{platform}/{sessionId}/open-url`). */
export default defineEndpoint({
    meta: {
        displayName: "Open URL on Simulator",
        summary: "Open a web page or deep link on a simulator session.",
        description:
            "Open a URL on one of YOUR sessions: an https address in the " +
            "device browser, or a deep link (myapp://settings) into an " +
            "installed app. The fastest way to jump an app straight to the " +
            "screen under test. Fails with a 4xx when no app on the device " +
            "handles the scheme, or for about:, data: and file: URLs. The " +
            "device may load content from the internet. Free.",
        categories: ["mobile-simulators"],
    },
    endpoint: "/open-url",
    request: {
        method: "POST",
        path: "/run-cloud/{platform}/{sessionId}/open-url",
    },
    input: {
        schema: { pathParams: zSessionPathParams, body: zOpenUrlBody },
    },
    resources: {
        uses: [{
            id: "runcloud/simulator-session",
            key: "$.pathParams.sessionId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
