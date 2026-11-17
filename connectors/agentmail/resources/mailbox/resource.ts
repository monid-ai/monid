import { z } from "zod";
import { defineResource, Unit } from "@shared/core";
import {
    zCreateInboxBody,
    zInboxBody,
    zUpdateInboxBody,
} from "../../schema/inputs.ts";

/**
 * Compiled identity: agentmail/mailbox. The maintainer confirmed the
 * legacy ResourceSlug.AGENTMAIL_INBOX value is "AgentMailInbox" on
 * 2026-10-27. The private host must bridge those identities at its
 * reader/store boundary; the compiled resource ID stays lowercase.
 * externalId is the email address used by Monid's public contract;
 * upstreamInboxId preserves the native ID.
 *
 * The maintainer's monid-services 01cb8fd5 billing snapshot supplies the
 * $1/GiB-month storage algorithm. The host supplies the actual period end,
 * including during partial and post-teardown readings.
 * The host owns the 3-day renewal lead, $0.10 storage buffer and immediate
 * teardown policy. These are not fields of the public resource def.
 */
export default defineResource({
    slug: "mailbox",
    meta: {
        displayName: "Mailbox",
        summary: "A workspace-owned AgentMail inbox, renting at $1/month.",
        docsUrl: "https://docs.agentmail.to/api-reference/inboxes/create",
        notes: [
            "The creating run pays the first month; the host renews from month two.",
            "Next month's rent is prepaid 3 days before the current period ends. Rent already charged is not refunded on release.",
            "Storage is $1 per GiB-month: mean storage bytes times elapsed/full-period duration, rounded to four decimal GB-months.",
            "Storage usage is reconciled daily and after mailbox deletion.",
        ],
    },
    data: z.strictObject({
        upstreamInboxId: z.string().min(1).regex(/^(?!\.{1,2}$)/),
        email: z.string().min(3).max(320),
        displayName: z.string().optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
        status: z.string().optional(),
    }),
    inputs: {
        create: zCreateInboxBody,
        update: zUpdateInboxBody,
        release: zInboxBody,
    },
    usage: {
        period: { unit: "MONTH", count: 1, anchor: "CREATION_TIME" },
        lines: {
            rent: { consumes: { credit: "default", amount: 1 } },
            storage: {
                price: {
                    unit: Unit.GB_MONTH,
                    every: 1,
                    consumes: { credit: "default", amount: 1 },
                },
            },
        },
    },
    reconcileUsage: {
        storage: {
            everyMs: 86_400_000,
            get: async ({ data, utils }) => {
                const row = data.resource;
                if (row.externalId !== row.data.email) {
                    throw new Error("inconsistent owned mailbox identity");
                }
                const start = utils.time.parseIso(data.window.startIso);
                const end = utils.time.parseIso(data.window.endIso);
                const periodEnd = utils.time.parseIso(data.window.periodEndIso);
                const windowMs = end - start;
                const periodMs = periodEnd - start;
                if (windowMs === 0) {
                    return {
                        consumes: { credit: "default", amount: 0 },
                        vendorConsumes: { credit: "default", amount: 0 },
                    };
                }
                const res = await utils.http({
                    method: "GET",
                    path: "/v0/inboxes/" +
                        encodeURIComponent(row.data.upstreamInboxId) +
                        "/metrics/usage",
                    queryParams: {
                        usage_types: "storage_bytes",
                        period: windowMs > 1000 * 3_600_000 ? "86400" : "3600",
                        start: data.window.startIso,
                        end: data.window.endIso,
                        limit: "1000",
                    },
                });
                if (res.status < 200 || res.status >= 300) {
                    throw new Error(
                        "mailbox storage metrics failed with HTTP " +
                            res.status,
                    );
                }
                const points = utils.json.optionalGet(
                    res.body,
                    "$.storage_bytes",
                );
                if (!Array.isArray(points)) {
                    throw new Error("invalid mailbox storage metrics series");
                }
                let sum = 0;
                for (const point of points) {
                    if (
                        point === null || typeof point !== "object" ||
                        Array.isArray(point) ||
                        typeof point.value !== "number" ||
                        !Number.isFinite(point.value) || point.value < 0
                    ) {
                        throw new Error(
                            "invalid mailbox storage metrics sample",
                        );
                    }
                    sum += point.value;
                }
                // Preserve the legacy arithmetic mean, binary GiB and
                // quantity-first rounding. A delayed release is not clamped.
                const mean = points.length === 0 ? 0 : sum / points.length;
                const gbMonths = Number(
                    ((mean / (1024 ** 3)) * (windowMs / periodMs)).toFixed(4),
                );
                if (!Number.isFinite(gbMonths)) {
                    throw new Error("invalid mailbox storage metrics total");
                }
                return {
                    consumes: { credit: "default", amount: gbMonths },
                    // Legacy bookkeeping deliberately records zero vendor
                    // cost here; the upstream invoice is reconciled offline.
                    vendorConsumes: { credit: "default", amount: 0 },
                };
            },
        },
    },
    lifecycle: {
        verify: async ({ data, utils }) => {
            const row = data.resource;
            if (row.externalId !== row.data.email) {
                throw new Error("inconsistent owned mailbox identity");
            }
            const res = await utils.http({
                method: "GET",
                path: "/v0/inboxes/" +
                    encodeURIComponent(row.data.upstreamInboxId),
            });
            if (res.status === 404) {
                return { active: false, inactiveReason: "http_404" };
            }
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "mailbox verify failed with HTTP " + res.status,
                );
            }
            const $ = utils.json;
            if (
                $.optionalGet(res.body, "$.inbox_id") !==
                    row.data.upstreamInboxId ||
                $.optionalGet(res.body, "$.email") !== row.data.email
            ) {
                throw new Error("invalid mailbox verification response");
            }
            // Paused mailboxes still exist and retain their rent schedule.
            return { active: true };
        },
        release: async ({ data, utils }) => {
            const row = data.resource;
            if (row.externalId !== row.data.email) {
                throw new Error("inconsistent owned mailbox identity");
            }
            const path = "/v0/inboxes/" +
                encodeURIComponent(row.data.upstreamInboxId);
            // Native DELETE may acknowledge even an already absent inbox.
            // Read first so a retry converges without restarting cleanup.
            const before = await utils.http({ method: "GET", path });
            if (before.status === 404 || before.status === 410) {
                return { released: true };
            }
            if (before.status < 200 || before.status >= 300) {
                throw new Error(
                    "mailbox release verification failed with HTTP " +
                        before.status,
                );
            }
            const $ = utils.json;
            if (
                $.optionalGet(before.body, "$.inbox_id") !==
                    row.data.upstreamInboxId ||
                $.optionalGet(before.body, "$.email") !== row.data.email
            ) {
                throw new Error(
                    "invalid mailbox release verification response",
                );
            }
            const res = await utils.http({
                method: "DELETE",
                path,
            });
            // Native cleanup can be asynchronous. Acceptance is not final
            // teardown: confirm absence or let the host retry the phase.
            if (res.status === 202) {
                const after = await utils.http({ method: "GET", path });
                if (after.status === 404 || after.status === 410) {
                    return { released: true };
                }
                throw new Error(
                    "mailbox deletion not yet confirmed; HTTP " +
                        after.status + "; retry release",
                );
            }
            if (
                !(res.status >= 200 && res.status < 300) &&
                res.status !== 404 && res.status !== 410
            ) {
                throw new Error(
                    "mailbox release failed with HTTP " + res.status,
                );
            }
            return { released: true };
        },
        refresh: async ({ data, utils }) => {
            const row = data.resource;
            if (row.externalId !== row.data.email) {
                throw new Error("inconsistent owned mailbox identity");
            }
            const res = await utils.http({
                method: "GET",
                path: "/v0/inboxes/" +
                    encodeURIComponent(row.data.upstreamInboxId),
            });
            if (res.status === 404) return { active: false };
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "mailbox refresh failed with HTTP " + res.status,
                );
            }
            const $ = utils.json;
            if (
                $.optionalGet(res.body, "$.inbox_id") !==
                    row.data.upstreamInboxId ||
                $.optionalGet(res.body, "$.email") !== row.data.email
            ) {
                throw new Error("invalid mailbox refresh response");
            }
            for (
                const key of [
                    "display_name",
                    "created_at",
                    "updated_at",
                    "status",
                ]
            ) {
                const value = $.optionalGet(res.body, "$." + key);
                if (value !== undefined && typeof value !== "string") {
                    throw new Error("invalid mailbox refresh field: " + key);
                }
            }
            const displayName = $.optionalStr(res.body, "$.display_name");
            const createdAt = $.optionalStr(res.body, "$.created_at") ??
                row.data.createdAt;
            const updatedAt = $.optionalStr(res.body, "$.updated_at") ??
                row.data.updatedAt;
            const status = $.optionalStr(res.body, "$.status");
            return {
                active: true,
                patch: {
                    upstreamInboxId: row.data.upstreamInboxId,
                    email: row.data.email,
                    ...(displayName !== undefined ? { displayName } : {}),
                    ...(createdAt !== undefined ? { createdAt } : {}),
                    ...(updatedAt !== undefined ? { updatedAt } : {}),
                    ...(status !== undefined ? { status } : {}),
                },
            };
        },
    },
});
