import { z } from "zod";
import { defineResource } from "@shared/core";

/**
 * computesdk/sandbox — one cloud sandbox this workspace created. It bills by
 * the second it exists, at the provider/size rate ComputeSDK quoted when it
 * was placed; commands, files and processes in it cost nothing on their own.
 * The `compute` line is ESTIMATED: the card shows the cheapest live rate,
 * and the reconcile reads each sandbox's own rate and runtime.
 */
export default defineResource({
    slug: "sandbox",
    meta: {
        displayName: "Sandbox",
        summary:
            "An isolated Linux cloud sandbox, billed by the second it runs.",
        description:
            "An isolated Linux sandbox ComputeSDK placed on one of over " +
            "26 providers (E2B, Daytona, Modal, Vercel, Cloudflare, " +
            "Blaxel, Agent37 and more) for this workspace. It bills by " +
            "the second from " +
            "creation until it is destroyed or its timeout reaps it, at " +
            "the provider and size rate shown when it was created. " +
            "Commands, file reads and writes, processes and URLs inside " +
            "it cost nothing extra.",
        docsUrl: "https://platform.computesdk.com/api/v1/openapi.json",
    },
    data: z.strictObject({
        provider: z.string().optional(),
        size: z.string().optional(),
        region: z.string().optional(),
        label: z.string().optional(),
    }),
    usage: {
        period: { unit: "DAY", count: 1, anchor: "CREATION_TIME" },
        lines: {
            // $0.00604/hr (Agent37 medium) is the cheapest live managed rate;
            // card display only — the reconcile bills the sandbox's own rate
            compute: {
                price: {
                    unit: "SECOND",
                    every: 1,
                    consumes: { credit: "default", amount: 0.00604 / 3600 },
                },
            },
        },
    },
    reconcileUsage: {
        compute: {
            everyMs: 3_600_000,
            get: async ({ data, utils }) => {
                const $ = utils.json;
                const res = await utils.http({
                    method: "GET",
                    path: "/api/v1/sandboxes/" + data.resource.externalId,
                });
                // a failed read (404 included) retries; it never settles 0
                if (res.status < 200 || res.status >= 300) {
                    throw new Error(
                        "computesdk sandbox read failed with HTTP " +
                            res.status,
                    );
                }
                const usd = $.optionalNum(res.body, "$.sandbox.cost.rate.usd");
                const per = $.optionalStr(res.body, "$.sandbox.cost.rate.per");
                const created = $.optionalStr(res.body, "$.sandbox.createdAt");
                if (
                    usd === undefined || created === undefined ||
                    (per !== "second" && per !== "minute" && per !== "hour")
                ) {
                    // BYOK: the org's own provider account bills it
                    return { consumes: { credit: "default", amount: 0 } };
                }
                const endedRaw = $.optionalGet(
                    res.body,
                    "$.sandbox.destroyedAt",
                );
                if (
                    endedRaw !== undefined && endedRaw !== null &&
                    typeof endedRaw !== "string"
                ) {
                    throw new Error(
                        "computesdk sandbox destroyedAt is not a timestamp",
                    );
                }
                // only null/absent means running; "" fails isoMs below
                const ended = typeof endedRaw === "string"
                    ? endedRaw
                    : undefined;
                // ISO-8601 -> epoch ms; fns are closed terms (no Date)
                const isoMs = (iso: string): number => {
                    const m = iso.match(
                        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:\d{2})$/,
                    );
                    if (m === null) {
                        throw new Error(
                            "computesdk reconcile: unsupported timestamp " +
                                iso,
                        );
                    }
                    let y = Number(m[1]);
                    const mo = Number(m[2]);
                    const d = Number(m[3]);
                    y -= mo <= 2 ? 1 : 0;
                    const era = Math.floor(y / 400);
                    const yoe = y - era * 400;
                    const doy =
                        Math.floor((153 * (mo + (mo > 2 ? -3 : 9)) + 2) / 5) +
                        d - 1;
                    const doe = yoe * 365 + Math.floor(yoe / 4) -
                        Math.floor(yoe / 100) + doy;
                    const days = era * 146097 + doe - 719468;
                    const frac = m[7] === undefined
                        ? 0
                        : Number("0." + m[7]) * 1000;
                    let offset = 0;
                    if (m[8] !== "Z") {
                        const sign = m[8][0] === "-" ? -1 : 1;
                        offset = sign *
                            (Number(m[8].slice(1, 3)) * 60 +
                                Number(m[8].slice(4, 6))) *
                            60_000;
                    }
                    return days * 86_400_000 + Number(m[4]) * 3_600_000 +
                        Number(m[5]) * 60_000 +
                        (m[6] === undefined ? 0 : Number(m[6])) * 1000 + frac -
                        offset;
                };
                const unitMs = per === "second"
                    ? 1_000
                    : per === "minute"
                    ? 60_000
                    : 3_600_000;
                const from = Math.max(
                    isoMs(created),
                    isoMs(data.window.startIso),
                );
                const to = Math.min(
                    ended !== undefined ? isoMs(ended) : Infinity,
                    isoMs(data.window.endIso),
                );
                const ms = Math.max(0, to - from);
                const amount = Math.ceil((usd * ms / unitMs) * 1e6) / 1e6;
                return { consumes: { credit: "default", amount } };
            },
        },
    },
    lifecycle: {
        verify: async ({ data, utils }) => {
            const $ = utils.json;
            const res = await utils.http({
                method: "GET",
                path: "/api/v1/sandboxes/" + data.resource.externalId,
            });
            if (res.status === 404) {
                return { active: false, inactiveReason: "http_404" };
            }
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "computesdk sandbox verify failed with HTTP " + res.status,
                );
            }
            const status = $.optionalStr(res.body, "$.sandbox.status");
            if (status === "destroyed") {
                const at = $.optionalStr(res.body, "$.sandbox.destroyedAt");
                return {
                    active: false,
                    inactiveReason: "destroyed_at:" + (at ?? "unknown"),
                };
            }
            return { active: true };
        },
        release: async ({ data, utils }) => {
            const res = await utils.http({
                method: "DELETE",
                path: "/api/v1/sandboxes/" + data.resource.externalId,
            });
            const gone = res.status === 404 || res.status === 410;
            if (!(res.status >= 200 && res.status < 300) && !gone) {
                throw new Error(
                    "computesdk sandbox destroy failed with HTTP " +
                        res.status,
                );
            }
            return { released: true };
        },
        refresh: async ({ data, utils }) => {
            const $ = utils.json;
            const res = await utils.http({
                method: "GET",
                path: "/api/v1/sandboxes/" + data.resource.externalId,
            });
            if (res.status === 404) return { active: false };
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "computesdk sandbox refresh failed with HTTP " +
                        res.status,
                );
            }
            if ($.optionalStr(res.body, "$.sandbox.status") === "destroyed") {
                return { active: false };
            }
            const provider = $.optionalStr(res.body, "$.sandbox.provider") ??
                data.resource.data.provider;
            const size = $.optionalStr(res.body, "$.sandbox.placement.size") ??
                data.resource.data.size;
            const region =
                $.optionalStr(res.body, "$.sandbox.placement.region") ??
                    data.resource.data.region;
            return {
                active: true,
                patch: {
                    ...data.resource.data,
                    ...(provider !== undefined ? { provider } : {}),
                    ...(size !== undefined ? { size } : {}),
                    ...(region !== undefined ? { region } : {}),
                },
            };
        },
    },
});
