import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zStartSessionBody, zStartSessionPathParams } from "./schema/inputs.ts";

/**
 * /start-session — start a cloud iOS simulator or Android emulator
 * (upstream `POST /run-cloud/{platform}`), the PROVISIONS anchor of
 * `runcloud/simulator-session`.
 *
 * The create is synchronous upstream (it waits for capacity, up to the
 * fleet's queue window, then for the device) and answers 201 with the
 * session, or 200 with the SAME session when the Idempotency-Key replays.
 * The start below sends `{runId}:start` as that key, so a retried activity
 * converges on the session the first attempt created instead of starting
 * and paying for a second one.
 *
 * Short by default, so a forgotten session cannot run up cost: 5 minutes
 * idle, 30 minutes total ($0.60 at most), the run.cloud MCP's own defaults.
 * `none` is refused for the idle timeout here.
 */
const shape = zStartSessionBody.shape;
export const zStartSessionBinding = zStartSessionBody.extend({
    inactivityTimeout: z.string().regex(/^\d+[smh]$/).describe(
        "Close the session after this long without activity, e.g. '60s' " +
            "or '5m' (default 5m; 'none' is not allowed here).",
    ).default("5m"),
    hardTimeout: shape.hardTimeout.unwrap().describe(
        "Maximum session lifetime, e.g. '10m' or '1h' (default 30m, " +
            "vendor maximum 195m). Billing runs for at most this long.",
    ).default("30m"),
});

export default defineEndpoint({
    meta: {
        displayName: "Start Simulator Session",
        summary:
            "Start a cloud iOS simulator or Android emulator; metered at $0.02 per active minute.",
        description: "Start a real iOS simulator (iPhone or iPad) or Android " +
            "emulator in the cloud, optionally installing uploaded apps " +
            "(installAssets) at boot. Returns the session: its `id` and " +
            "`platform` (pass both to every other run.cloud endpoint), " +
            "status, device model and OS version, timestamps, and `url`, a " +
            "signed live-viewer link for the user. The session is an owned " +
            "resource metered at $0.02 per active minute until you call " +
            "/stop-session or it times out (5 minutes idle, 30 minutes " +
            "total by default). Next: /read-screen to see what is on " +
            "screen, then /tap, /type-text and friends to drive it.",
        docsUrl: "https://docs.run.cloud/ios/run-simulator",
        categories: ["mobile-simulators"],
        notes: [
            "Running this SPENDS MONEY: $0.02 per active minute, pro-rated " +
            "per second, from start until /stop-session or a timeout. The " +
            "defaults cap a forgotten session at 30 minutes ($0.60).",
            "Call /stop-session as soon as you are done: it ends the meter " +
            "immediately.",
            "`url` is a signed live-viewer link: treat it as a secret and " +
            "share it only with the user who started the session.",
            "Creation can wait for capacity (up to a few minutes) before " +
            "the device boots.",
            "The body is required even when every field is defaulted: send " +
            "`{}` for a default device with the short timeouts.",
        ],
    },
    endpoint: "/start-session",
    request: { method: "POST", path: "/run-cloud/{platform}" },
    input: {
        schema: {
            pathParams: zStartSessionPathParams,
            body: zStartSessionBinding,
        },
    },
    // capacity queue (fleet default 90 s, max 300 s) plus device boot
    timeouts: { requestMs: 360_000, runMs: 420_000 },
    resources: {
        provisions: [{
            id: "runcloud/simulator-session",
            /**
             * PURE, on the RAW settle body. A 2xx without a readable id is
             * never "nothing provisioned" for a create: the THROW maps to
             * PROVISION_CONSTRUCT (host alarms, run stays uncharged).
             */
            seed: ({ data, utils }) => {
                const $ = utils.json;
                const id = $.optionalGet(data.output, "$.id");
                if (typeof id !== "string" || id === "") {
                    throw new Error(
                        "run.cloud returned success but no readable session id",
                    );
                }
                const platform = $.optionalGet(data.output, "$.platform") ??
                    $.optionalGet(data.input.pathParams ?? {}, "$.platform");
                return {
                    resource: "runcloud/simulator-session",
                    externalId: id,
                    data: {
                        platform: platform === "android" ? "android" : "ios",
                    },
                };
            },
        }],
    },
    // every control call is free; the session's time is billed by the
    // resource's `active-time` line, never here
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data, utils }) => {
            const res = await utils.request({
                headers: { "Idempotency-Key": data.run.runId + ":start" },
            });
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
