import { z } from "zod";
import { defineResource, Unit } from "@shared/core";
import { zSandboxId, zSize } from "../../schema/common.ts";

/**
 * boxcompute/vm — a Linux VM with its /workspace disk, owned by one
 * workspace from /create-sandbox until /delete-sandbox.
 *
 * USAGE: one ESTIMATED line, `compute`. What a VM costs depends on how long
 * it runs, which nobody knows in advance: it bills per second while running
 * (at least a minute per start) and nothing while stopped, and it stops on
 * its own after 30 idle minutes. The card shows the Small rate, $0.000834 a
 * minute; a Large VM is 3x. The bill is BoxCompute's own cost API, read by
 * `reconcileUsage.compute`, so it is right for either size. The period is a
 * day so a long-lived VM settles daily.
 */
export default defineResource({
    slug: "vm",
    meta: {
        displayName: "VM",
        summary: "A Linux VM with its own /workspace disk.",
        description:
            "A Linux VM owned by this workspace. It bills per second while " +
            "it runs (Small $0.05/hour, Large $0.15/hour, at least one " +
            "minute per start) and nothing while stopped. /workspace " +
            "survives stops until the VM is deleted.",
        docsUrl: "https://boxcompute.ai/docs/",
    },
    data: z.strictObject({
        size: zSize,
        name: z.string().optional(),
        /** true: created without a network interface. */
        blockNetwork: z.boolean().optional(),
    }),
    inputs: {
        create: z.object({
            size: zSize.optional(),
            name: z.string().optional(),
            blockNetwork: z.boolean().optional(),
        }),
        release: z.object({ sandboxId: zSandboxId }),
    },
    usage: {
        period: { unit: "DAY", count: 1, anchor: "CREATION_TIME" },
        lines: {
            compute: {
                price: {
                    unit: Unit.MINUTE,
                    every: 1,
                    consumes: { credit: "default", amount: 0.000834 },
                },
            },
        },
    },
    reconcileUsage: {
        compute: {
            everyMs: 3_600_000,
            /**
             * The VM's cost in the window, from `GET .../costs`: every
             * settled run (start to stop, already priced) and the estimate
             * of the run in progress, each counted for the share of its
             * time inside the window.
             *
             * A deleted VM keeps its cost history under its own id
             * (`dsb_…`), found by the VM id it records, because the host
             * reads the meter once more after teardown.
             *
             * Every doubtful read THROWS so the host settles later instead
             * of billing short: a history over 1,000 runs (the API returns
             * the oldest 1,000, so the recent ones would be missing), or a
             * running estimate BoxCompute could not compute.
             */
            get: async ({ data, utils }) => {
                const $ = utils.json;
                const id = data.resource.externalId;
                let res = await utils.http({
                    method: "GET",
                    path: "/api/v2/sandboxes/" + id + "/costs",
                });
                if (res.status === 404) {
                    const deleted = await utils.http({
                        method: "GET",
                        path: "/api/v2/deleted-sandboxes",
                    });
                    if (deleted.status < 200 || deleted.status >= 300) {
                        throw new Error(
                            "boxcompute deleted-VM lookup failed with HTTP " +
                                deleted.status,
                        );
                    }
                    const rows = $.optionalGet(
                        deleted.body,
                        "$.deletedSandboxes",
                    );
                    const history = Array.isArray(rows)
                        ? rows.map((row) => ({
                            id: $.optionalStr(row, "$.id"),
                            sandboxId: $.optionalStr(row, "$.sandboxId"),
                        })).find((row) => row.sandboxId === id)
                        : undefined;
                    if (history === undefined || history.id === undefined) {
                        throw new Error(
                            "boxcompute has no cost history for " + id,
                        );
                    }
                    res = await utils.http({
                        method: "GET",
                        path: "/api/v2/deleted-sandboxes/" + history.id +
                            "/costs",
                    });
                }
                if (res.status < 200 || res.status >= 300) {
                    throw new Error(
                        "boxcompute cost read failed with HTTP " + res.status,
                    );
                }
                if ($.optionalGet(res.body, "$.costs.truncated") === true) {
                    throw new Error(
                        "boxcompute cost history for " + id +
                            " is over 1000 runs; the newest are not listed",
                    );
                }
                if ($.str(res.body, "$.costs.estimates") === "unavailable") {
                    throw new Error(
                        "boxcompute could not estimate the running cost of " +
                            id,
                    );
                }
                // ISO-8601 UTC (`Z`, optional fraction) to epoch ms, via
                // days-from-civil: `Date` is not available to fns.
                const [start, end] = [
                    data.window.startIso,
                    data.window.endIso,
                ].map((iso) => {
                    const year = Number(iso.slice(0, 4));
                    const month = Number(iso.slice(5, 7));
                    const day = Number(iso.slice(8, 10));
                    const seconds = iso[16] === ":"
                        ? Number(iso.slice(17).replace("Z", ""))
                        : 0;
                    const y = month <= 2 ? year - 1 : year;
                    const era = Math.floor(y / 400);
                    const yoe = y - era * 400;
                    const doy = Math.floor(
                        (153 * (month + (month > 2 ? -3 : 9)) + 2) / 5,
                    ) + day - 1;
                    const doe = yoe * 365 + Math.floor(yoe / 4) -
                        Math.floor(yoe / 100) + doy;
                    const days = era * 146097 + doe - 719468;
                    return ((days * 24 + Number(iso.slice(11, 13))) * 60 +
                                Number(iso.slice(14, 16))) * 60_000 +
                        Math.round(seconds * 1000);
                });
                const settled = $.optionalGet(res.body, "$.costs.runs");
                const running = $.optionalGet(res.body, "$.costs.running");
                const spans = [
                    ...(Array.isArray(settled) ? settled : []).map((run) => ({
                        from: $.num(run, "$.startedAt"),
                        to: $.num(run, "$.endedAt"),
                        micros: $.num(run, "$.amountMicros"),
                    })),
                    ...(Array.isArray(running) ? running : []).map((run) => ({
                        from: $.num(run, "$.startedAt"),
                        to: $.num(run, "$.startedAt") +
                            $.num(run, "$.billableSeconds") * 1000,
                        micros: $.num(run, "$.estimatedMicros"),
                    })),
                ];
                let micros = 0;
                for (const span of spans) {
                    if (span.to <= span.from) {
                        if (span.from >= start && span.from < end) {
                            micros += span.micros;
                        }
                        continue;
                    }
                    const inside = Math.min(span.to, end) -
                        Math.max(span.from, start);
                    if (inside > 0) {
                        micros += span.micros * inside / (span.to - span.from);
                    }
                }
                return {
                    consumes: {
                        credit: "default",
                        amount: Math.round(micros) / 1_000_000,
                    },
                };
            },
        },
    },
    lifecycle: {
        /**
         * Alive unless BoxCompute no longer has it (404) or it is `expired`,
         * the state of a VM BoxCompute refused at creation or retired; an
         * expired VM never runs again. Other failures THROW (retriable).
         */
        verify: async ({ data, utils }) => {
            const res = await utils.http({
                method: "GET",
                path: "/api/v2/sandboxes/" + data.resource.externalId,
            });
            if (res.status === 404) {
                return { active: false, inactiveReason: "http_404" };
            }
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "boxcompute VM verify failed with HTTP " + res.status,
                );
            }
            if (
                utils.json.optionalStr(res.body, "$.sandbox.state") ===
                    "expired"
            ) {
                return { active: false, inactiveReason: "state:expired" };
            }
            return { active: true };
        },
        /**
         * `DELETE /api/v2/sandboxes/{id}` removes the VM and its disk.
         * Already gone (404) is success, since /delete-sandbox deletes at
         * once and this op runs after it. 409 (still stopping or in use)
         * and other failures THROW so the host retries.
         */
        release: async ({ data, utils }) => {
            const res = await utils.http({
                method: "DELETE",
                path: "/api/v2/sandboxes/" + data.resource.externalId,
            });
            if (
                !(res.status >= 200 && res.status < 300) && res.status !== 404
            ) {
                throw new Error(
                    "boxcompute VM delete failed with HTTP " + res.status,
                );
            }
            return { released: true };
        },
        /** Re-read size, name and network; 404 or expired is inactive. */
        refresh: async ({ data, utils }) => {
            const $ = utils.json;
            const res = await utils.http({
                method: "GET",
                path: "/api/v2/sandboxes/" + data.resource.externalId,
            });
            if (res.status === 404) return { active: false };
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "boxcompute VM refresh failed with HTTP " + res.status,
                );
            }
            if ($.optionalStr(res.body, "$.sandbox.state") === "expired") {
                return { active: false };
            }
            const size = $.optionalStr(res.body, "$.sandbox.size");
            const name = $.optionalStr(res.body, "$.sandbox.name");
            const blockNetwork = $.optionalGet(
                res.body,
                "$.sandbox.blockNetwork",
            );
            return {
                active: true,
                patch: {
                    size: size === "small" || size === "large"
                        ? size
                        : data.resource.data.size,
                    ...(name !== undefined ? { name } : {}),
                    ...(typeof blockNetwork === "boolean"
                        ? { blockNetwork }
                        : {}),
                },
            };
        },
    },
});
