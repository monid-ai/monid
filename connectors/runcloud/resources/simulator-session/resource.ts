import { z } from "zod";
import { defineResource } from "@shared/core";

/**
 * runcloud/simulator-session — one cloud iOS simulator or Android emulator
 * session, provisioned by /start-session and released by /stop-session (or
 * by the platform through `lifecycle.release`).
 *
 * USAGE: one ESTIMATED line, `active-time`, at run.cloud's published
 * $0.02 per active minute (https://run.cloud/pricing). run.cloud meters it
 * per second: `max(0, floor(billableUntil - createdAt))` seconds at
 * $0.02/60, where billableUntil is the release time, else the expiry once
 * passed, else now, and only once a device was leased. The session payload
 * carries every input of that formula, so the reconciler re-derives the
 * vendor's own bill from it; there is no fixed line, because a session has
 * no rent.
 *
 * The clock is one DAY: run.cloud caps a session at 195 minutes, so a
 * session's whole life sits inside its first period, and the cumulative
 * reading of that period is the whole session counted from the vendor's
 * own `createdAt`.
 */
export default defineResource({
    slug: "simulator-session",
    meta: {
        displayName: "Simulator Session",
        summary: "A running cloud iOS simulator or Android emulator.",
        description: "A live iOS simulator or Android emulator owned by this " +
            "workspace. Metered at $0.02 per active minute, pro-rated per " +
            "second, from start until it is stopped or times out. Stopping " +
            "it ends the meter immediately; the device and its state are " +
            "gone.",
        docsUrl: "https://docs.run.cloud/ios/run-simulator",
    },
    data: z.strictObject({
        /** Routes are per platform: `/run-cloud/{platform}/{id}`. */
        platform: z.enum(["ios", "android"]),
    }),
    usage: {
        period: { unit: "DAY", count: 1, anchor: "CREATION_TIME" },
        lines: {
            "active-time": {
                price: {
                    unit: "MINUTE",
                    every: 1,
                    consumes: { credit: "default", amount: 0.02 },
                },
            },
        },
    },
    reconcileUsage: {
        "active-time": {
            everyMs: 3_600_000,
            /**
             * Cumulative reading for `[window.startIso, window.endIso)`:
             * the vendor's billed seconds as of `endIso`, read from the
             * session itself. Session rows outlive release, so the
             * post-teardown tail read works; any non-2xx THROWS (settle
             * late, never a silent $0).
             */
            get: async ({ data, utils }) => {
                const $ = utils.json;
                const res = await utils.http({
                    method: "GET",
                    path: "/run-cloud/" + data.resource.data.platform + "/" +
                        encodeURIComponent(data.resource.externalId),
                });
                if (res.status < 200 || res.status >= 300) {
                    throw new Error(
                        "run.cloud session read failed with HTTP " +
                            res.status,
                    );
                }
                const text = (path: string) => {
                    const value = $.optionalGet(res.body, path);
                    return typeof value === "string" && value !== ""
                        ? value
                        : undefined;
                };
                // No Date in a closed term: ISO-8601 UTC ("...Z") to epoch
                // seconds by hand (days-from-civil, proleptic Gregorian).
                const epoch = (iso: string) => {
                    const m = iso.match(
                        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?Z$/,
                    );
                    if (m === null) {
                        throw new Error("unparseable timestamp: " + iso);
                    }
                    const month = Number(m[2]);
                    const year = Number(m[1]) - (month <= 2 ? 1 : 0);
                    const era = Math.floor(year / 400);
                    const yoe = year - era * 400;
                    const doy = Math.floor(
                        (153 * (month + (month > 2 ? -3 : 9)) + 2) / 5,
                    ) + Number(m[3]) - 1;
                    const doe = yoe * 365 + Math.floor(yoe / 4) -
                        Math.floor(yoe / 100) + doy;
                    const days = era * 146097 + doe - 719468;
                    return days * 86400 + Number(m[4]) * 3600 +
                        Number(m[5]) * 60 + Number(m[6] ?? 0);
                };
                const zero = { consumes: { credit: "default", amount: 0 } };
                // run.cloud meters only sessions that got a device
                if (text("$.leaseId") === undefined) return zero;
                const createdAt = text("$.createdAt");
                if (createdAt === undefined) {
                    throw new Error("run.cloud session has no createdAt");
                }
                const windowStart = epoch(data.window.startIso);
                const windowEnd = epoch(data.window.endIso);
                // sessionPayload reports an expired session as released at
                // its expiry, so releasedAt is the billable end when set
                const releasedAt = text("$.releasedAt");
                const end = Math.min(
                    releasedAt !== undefined ? epoch(releasedAt) : windowEnd,
                    windowEnd,
                );
                if (end <= windowStart) return zero;
                const seconds = Math.max(
                    0,
                    Math.floor(end - epoch(createdAt)),
                );
                return {
                    consumes: {
                        credit: "default",
                        // nanodollar precision, the vendor's own meter unit
                        amount: Math.round(seconds * 0.02 / 60 * 1e9) / 1e9,
                    },
                };
            },
        },
    },
    lifecycle: {
        /**
         * Aliveness before every charge: 404 or a session no longer
         * `active`/`provisioning` (released, failed, expired) is inactive;
         * any other non-2xx THROWS (retriable, never conclude from a flaky
         * read).
         */
        verify: async ({ data, utils }) => {
            const res = await utils.http({
                method: "GET",
                path: "/run-cloud/" + data.resource.data.platform + "/" +
                    encodeURIComponent(data.resource.externalId),
            });
            if (res.status === 404) {
                return { active: false, inactiveReason: "http_404" };
            }
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "run.cloud session verify failed with HTTP " + res.status,
                );
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "active" || status === "provisioning") {
                return { active: true };
            }
            return {
                active: false,
                inactiveReason: "status:" + String(status),
            };
        },
        /**
         * Idempotent teardown: `DELETE` ends the meter. 2xx/404/410 is
         * released. Any other answer (run.cloud's 503
         * `simulator_release_pending`, a failed session it cannot release
         * again) is settled by a re-read: a session no longer
         * active/provisioning is released, otherwise THROW so the platform
         * retries.
         */
        release: async ({ data, utils }) => {
            const path = "/run-cloud/" + data.resource.data.platform + "/" +
                encodeURIComponent(data.resource.externalId);
            const del = await utils.http({ method: "DELETE", path });
            if (
                (del.status >= 200 && del.status < 300) ||
                del.status === 404 || del.status === 410
            ) {
                return { released: true };
            }
            const read = await utils.http({ method: "GET", path });
            const status = utils.json.optionalGet(read.body, "$.status");
            if (
                read.status === 404 ||
                (read.status >= 200 && read.status < 300 &&
                    status !== "active" && status !== "provisioning")
            ) {
                return { released: true };
            }
            throw new Error(
                "run.cloud session release failed with HTTP " + del.status,
            );
        },
    },
});
