import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSessionPathParams } from "../../schema/common.ts";
import { zDeviceLogsQueryParams } from "./schema/inputs.ts";

/**
 * /device-logs — a snapshot of the device's recent log lines
 * (`GET /run-cloud/{platform}/{sessionId}/logs?tail=N`).
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Simulator Device Logs",
        summary:
            "Read the most recent system and app log lines from a simulator session.",
        description: "Read recent system and app log lines from one of YOUR " +
            "sessions, oldest first, each with its timestamp: crash " +
            "reports, JavaScript errors from a React Native or Expo app, " +
            "network failures, and anything the app prints. Use it right " +
            "after a step fails or an app closes unexpectedly. `tail` picks " +
            "how many recent lines (default 200, max 1000); `truncated` " +
            "says when older lines were cut. Free.",
        categories: ["mobile-simulators"],
    },
    endpoint: "/device-logs",
    request: { method: "GET", path: "/run-cloud/{platform}/{sessionId}/logs" },
    input: {
        schema: {
            pathParams: zSessionPathParams,
            queryParams: zDeviceLogsQueryParams.extend({
                tail: zDeviceLogsQueryParams.shape.tail.unwrap().describe(
                    "How many of the most recent log lines to return " +
                        "(1-1000, default 200, the vendor's own default).",
                ).default(200),
            }),
        },
    },
    resources: {
        reads: [{
            id: "runcloud/simulator-session",
            key: "$.pathParams.sessionId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
