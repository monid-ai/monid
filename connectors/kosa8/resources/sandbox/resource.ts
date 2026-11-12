import { z } from "zod";
import { defineResource } from "@shared/core";
import { zRegionId, zTemplateKey } from "../../schema/common.ts";

/**
 * kosa8/sandbox — one sealed microVM held on the workspace's behalf.
 *
 * USAGE (the rate card, worker `billing.js` RATES / `GET /v1/pricing`):
 * three ESTIMATED lines, the same three terms as the worker's own
 * `computeCost` + `sleepCost`:
 *   - `vcpu`             $0.048 per vCPU-hour running   (quantity: vCPU-seconds)
 *   - `memory`           $0.0154 per GiB-hour running   (quantity: GiB-seconds)
 *   - `snapshot-storage` $0.08 per GiB-month asleep, a month being 730 h
 *                        (quantity: snapshot-GiB-seconds)
 * each times the region multiplier (eu 1.0; us / ap 1.2 — `REGION_
 * MULTIPLIERS`). kosa8 bills per second, so the display cards price per
 * SECOND in hour (or 730-hour) blocks.
 *
 * THE METER (`reconcileUsage`): `GET /v1/sandboxes/{id}` reports the
 * sandbox's LIFETIME `running_s`, `asleep_s`, `cpus`, `mem_mb`,
 * `sleep_bytes` and `region`; each line's reading is that line's term of
 * kosa8's own cost formula over those fields. Lifetime equals "since the
 * period start" because /create-sandbox REQUIRES a `ttl_s` of at most 28
 * days: kosa8 deletes the sandbox at its TTL, so it never outlives its
 * first (CREATION_TIME, one-month) period. A deleted sandbox answers 404
 * on the id route, so the post-teardown read falls back to
 * `GET /v1/sandboxes?all=1` (deleted rows included) and finds it there;
 * not found → THROW (settle late, never a silent $0).
 *
 * LIFECYCLE: verify = the id route (404 / `deleted` / `error` ⇒ inactive);
 * release = `DELETE /v1/sandboxes/{id}`, 404 tolerated (the user's
 * /delete-sandbox, or kosa8's TTL, may already have deleted it).
 */
export default defineResource({
    slug: "sandbox",
    meta: {
        displayName: "Sandbox",
        summary: "A sealed microVM sandbox, billed per second while it runs.",
        description: "A kosa8 Cloud sandbox owned by this workspace: its own " +
            "microVM and kernel, created from a template, deleted at the " +
            "ttl_s it was created with or when you delete it. Billed per " +
            "second while running ($0.048 per vCPU-hour plus $0.0154 per " +
            "GiB-hour of RAM in the EU); while asleep only its snapshot " +
            "is billed ($0.08 per GiB-month).",
        docsUrl: "https://docs.kosa8.com/guides/cloud/",
    },
    data: z.strictObject({
        template: z.string(),
        region: z.string().nullable(),
        cpus: z.number(),
        memMb: z.number(),
    }),
    /** Catalog shape of the create action. No `release` slot: the
     *  compiler checks slots against an endpoint's BODY, and
     *  /delete-sandbox takes the sandbox id as its `{id}` path param. */
    inputs: {
        create: z.object({
            template: zTemplateKey.optional(),
            region: zRegionId.optional(),
            ttl_s: z.number().int().min(60).max(2_419_200),
        }),
    },
    usage: {
        period: { unit: "MONTH", count: 1, anchor: "CREATION_TIME" },
        lines: {
            vcpu: {
                price: {
                    unit: "SECOND",
                    every: 3600,
                    consumes: { credit: "default", amount: 0.048 },
                },
            },
            memory: {
                price: {
                    unit: "SECOND",
                    every: 3600,
                    consumes: { credit: "default", amount: 0.0154 },
                },
            },
            "snapshot-storage": {
                price: {
                    unit: "SECOND",
                    every: 2_628_000,
                    consumes: { credit: "default", amount: 0.08 },
                },
            },
        },
    },
    reconcileUsage: {
        vcpu: {
            everyMs: 3_600_000,
            get: async ({ data, utils }) => {
                const $ = utils.json;
                const id = data.resource.externalId;
                const one = await utils.http({
                    method: "GET",
                    path: "/v1/sandboxes/" + id,
                });
                if (one.status !== 200 && one.status !== 404) {
                    throw new Error(
                        "kosa8 sandbox read failed with HTTP " + one.status,
                    );
                }
                // 404 = deleted (or never ours): the list with deleted
                // rows still carries its final counters
                const all = one.status === 404
                    ? await utils.http({
                        method: "GET",
                        path: "/v1/sandboxes",
                        queryParams: { all: "1" },
                    })
                    : undefined;
                if (all !== undefined && all.status !== 200) {
                    throw new Error(
                        "kosa8 sandbox list failed with HTTP " + all.status,
                    );
                }
                const list = all === undefined
                    ? []
                    : $.get(all.body, "$.sandboxes");
                const sbx = all === undefined
                    ? $.get(one.body, "$.sandbox")
                    : Array.isArray(list)
                    ? list.find((s) => $.optionalStr(s, "$.id") === id)
                    : undefined;
                if (sbx === undefined) {
                    throw new Error("kosa8 sandbox " + id + " not found");
                }
                const region = $.optionalStr(sbx, "$.region") ?? "";
                const prefix = region.split("-")[0];
                const mult = $.optionalGet(sbx, "$.own_host") === true
                    ? 0
                    : prefix === "us" || prefix === "ap"
                    ? 1.2
                    : 1;
                const amount = ($.num(sbx, "$.running_s") / 3600) *
                    $.num(sbx, "$.cpus") * 0.048 * mult;
                return { consumes: { credit: "default", amount } };
            },
        },
        memory: {
            everyMs: 3_600_000,
            get: async ({ data, utils }) => {
                const $ = utils.json;
                const id = data.resource.externalId;
                const one = await utils.http({
                    method: "GET",
                    path: "/v1/sandboxes/" + id,
                });
                if (one.status !== 200 && one.status !== 404) {
                    throw new Error(
                        "kosa8 sandbox read failed with HTTP " + one.status,
                    );
                }
                // 404 = deleted (or never ours): the list with deleted
                // rows still carries its final counters
                const all = one.status === 404
                    ? await utils.http({
                        method: "GET",
                        path: "/v1/sandboxes",
                        queryParams: { all: "1" },
                    })
                    : undefined;
                if (all !== undefined && all.status !== 200) {
                    throw new Error(
                        "kosa8 sandbox list failed with HTTP " + all.status,
                    );
                }
                const list = all === undefined
                    ? []
                    : $.get(all.body, "$.sandboxes");
                const sbx = all === undefined
                    ? $.get(one.body, "$.sandbox")
                    : Array.isArray(list)
                    ? list.find((s) => $.optionalStr(s, "$.id") === id)
                    : undefined;
                if (sbx === undefined) {
                    throw new Error("kosa8 sandbox " + id + " not found");
                }
                const region = $.optionalStr(sbx, "$.region") ?? "";
                const prefix = region.split("-")[0];
                const mult = $.optionalGet(sbx, "$.own_host") === true
                    ? 0
                    : prefix === "us" || prefix === "ap"
                    ? 1.2
                    : 1;
                const amount = ($.num(sbx, "$.running_s") / 3600) *
                    ($.num(sbx, "$.mem_mb") / 1024) * 0.0154 * mult;
                return { consumes: { credit: "default", amount } };
            },
        },
        "snapshot-storage": {
            everyMs: 3_600_000,
            get: async ({ data, utils }) => {
                const $ = utils.json;
                const id = data.resource.externalId;
                const one = await utils.http({
                    method: "GET",
                    path: "/v1/sandboxes/" + id,
                });
                if (one.status !== 200 && one.status !== 404) {
                    throw new Error(
                        "kosa8 sandbox read failed with HTTP " + one.status,
                    );
                }
                // 404 = deleted (or never ours): the list with deleted
                // rows still carries its final counters
                const all = one.status === 404
                    ? await utils.http({
                        method: "GET",
                        path: "/v1/sandboxes",
                        queryParams: { all: "1" },
                    })
                    : undefined;
                if (all !== undefined && all.status !== 200) {
                    throw new Error(
                        "kosa8 sandbox list failed with HTTP " + all.status,
                    );
                }
                const list = all === undefined
                    ? []
                    : $.get(all.body, "$.sandboxes");
                const sbx = all === undefined
                    ? $.get(one.body, "$.sandbox")
                    : Array.isArray(list)
                    ? list.find((s) => $.optionalStr(s, "$.id") === id)
                    : undefined;
                if (sbx === undefined) {
                    throw new Error("kosa8 sandbox " + id + " not found");
                }
                const region = $.optionalStr(sbx, "$.region") ?? "";
                const prefix = region.split("-")[0];
                const mult = $.optionalGet(sbx, "$.own_host") === true
                    ? 0
                    : prefix === "us" || prefix === "ap"
                    ? 1.2
                    : 1;
                const gib = $.num(sbx, "$.sleep_bytes") / 1073741824;
                const amount = ($.num(sbx, "$.asleep_s") / 3600) * gib *
                    (0.08 / 730) * mult;
                return { consumes: { credit: "default", amount } };
            },
        },
    },
    lifecycle: {
        verify: async ({ data, utils }) => {
            const res = await utils.http({
                method: "GET",
                path: "/v1/sandboxes/" + data.resource.externalId,
            });
            if (res.status === 404) {
                return { active: false, inactiveReason: "http_404" };
            }
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "kosa8 sandbox verify failed with HTTP " + res.status,
                );
            }
            const state = utils.json.optionalStr(res.body, "$.sandbox.state");
            if (state === "deleted" || state === "error") {
                return { active: false, inactiveReason: "state:" + state };
            }
            return { active: true };
        },
        release: async ({ data, utils }) => {
            const res = await utils.http({
                method: "DELETE",
                path: "/v1/sandboxes/" + data.resource.externalId,
            });
            if (
                !(res.status >= 200 && res.status < 300) && res.status !== 404
            ) {
                throw new Error(
                    "kosa8 sandbox delete failed with HTTP " + res.status,
                );
            }
            return { released: true };
        },
    },
});
