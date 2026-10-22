import { z } from "zod";
import { defineResource, Unit } from "@shared/core";

export default defineResource({
    slug: "mailbox",
    meta: {
        displayName: "Inbox",
        summary: "An email inbox owned by this workspace.",
        description: "An inbox for reading and sending email.",
        notes: [
            "Inbox creation, monthly rent and release cost USD 0. Endpoint calls have a zero call fee.",
            "Connected outbound costs USD 0.000500 per provider-accepted recipient occurrence. Managed outbound costs USD 0.000750 per provider-accepted recipient occurrence.",
            "Accepted To, Cc and Bcc occurrences count separately. Rejected recipients are not charged.",
            "Incoming mail costs USD 0.000500 per distinct mailbox delivery.",
            "Storage costs USD 0.02 per decimal GB-month, prorated by calendar day.",
            "Usage readings report posted outgoing, incoming and storage costs with zero markup. They do not add a send-call charge.",
        ],
    },
    data: z.strictObject({ email: z.email() }),
    inputs: {
        create: z.strictObject({ email: z.email() }),
        release: z.strictObject({ public_id: z.string().min(1) }),
    },
    usage: {
        period: { unit: "MONTH", count: 1, anchor: "CREATION_TIME" },
        lines: {
            rent: { consumes: { credit: "default", amount: 0 } },
            incoming: {
                price: {
                    unit: Unit.CREDIT,
                    consumes: { credit: "default", amount: 1 },
                },
            },
            outgoing: {
                price: {
                    unit: Unit.CREDIT,
                    consumes: { credit: "default", amount: 1 },
                },
            },
            storage: {
                price: {
                    unit: Unit.CREDIT,
                    consumes: { credit: "default", amount: 1 },
                },
            },
        },
    },
    reconcileUsage: {
        incoming: {
            everyMs: 3_600_000,
            get: async ({ data, utils }) => {
                const res = await utils.http({
                    method: "GET",
                    path: "/api/v1/mailboxes/" +
                        encodeURIComponent(data.resource.externalId) + "/usage",
                    queryParams: {
                        start: data.window.startIso,
                        end: data.window.endIso,
                    },
                });
                if (res.status !== 200) {
                    throw new Error(
                        "Inbox cost read failed: HTTP " + res.status,
                    );
                }
                const $ = utils.json;
                const body = $.get(res.body, "$.data");
                if (
                    $.str(body, "$.mailbox_id") !== data.resource.externalId ||
                    $.str(body, "$.start") !== data.window.startIso ||
                    $.str(body, "$.end") !== data.window.endIso ||
                    $.str(body, "$.currency") !== "USD" ||
                    $.str(body, "$.state") !== "final" ||
                    $.str(body, "$.incoming.state") !== "final" ||
                    $.str(body, "$.outgoing.state") !== "final" ||
                    $.str(body, "$.storage.state") !== "final"
                ) {
                    throw new Error(
                        "Inbox cost window is not final or does not match the requested window",
                    );
                }
                const amount = $.str(body, "$.incoming.posted_amount");
                if (
                    !/^\d+\.\d{6}$/.test(amount) ||
                    !Number.isFinite(Number(amount))
                ) throw new Error("Invalid posted inbox cost");
                return {
                    consumes: { credit: "default", amount: Number(amount) },
                };
            },
        },
        outgoing: {
            everyMs: 3_600_000,
            get: async ({ data, utils }) => {
                const res = await utils.http({
                    method: "GET",
                    path: "/api/v1/mailboxes/" +
                        encodeURIComponent(data.resource.externalId) + "/usage",
                    queryParams: {
                        start: data.window.startIso,
                        end: data.window.endIso,
                    },
                });
                if (res.status !== 200) {
                    throw new Error(
                        "Inbox cost read failed: HTTP " + res.status,
                    );
                }
                const $ = utils.json;
                const body = $.get(res.body, "$.data");
                if (
                    $.str(body, "$.mailbox_id") !== data.resource.externalId ||
                    $.str(body, "$.start") !== data.window.startIso ||
                    $.str(body, "$.end") !== data.window.endIso ||
                    $.str(body, "$.currency") !== "USD" ||
                    $.str(body, "$.state") !== "final" ||
                    $.str(body, "$.incoming.state") !== "final" ||
                    $.str(body, "$.outgoing.state") !== "final" ||
                    $.str(body, "$.storage.state") !== "final"
                ) {
                    throw new Error(
                        "Inbox cost window is not final or does not match the requested window",
                    );
                }
                const amount = $.str(body, "$.outgoing.posted_amount");
                if (
                    !/^\d+\.\d{6}$/.test(amount) ||
                    !Number.isFinite(Number(amount))
                ) throw new Error("Invalid posted inbox cost");
                return {
                    consumes: { credit: "default", amount: Number(amount) },
                };
            },
        },
        storage: {
            everyMs: 3_600_000,
            get: async ({ data, utils }) => {
                const res = await utils.http({
                    method: "GET",
                    path: "/api/v1/mailboxes/" +
                        encodeURIComponent(data.resource.externalId) + "/usage",
                    queryParams: {
                        start: data.window.startIso,
                        end: data.window.endIso,
                    },
                });
                if (res.status !== 200) {
                    throw new Error(
                        "Inbox cost read failed: HTTP " + res.status,
                    );
                }
                const $ = utils.json;
                const body = $.get(res.body, "$.data");
                if (
                    $.str(body, "$.mailbox_id") !== data.resource.externalId ||
                    $.str(body, "$.start") !== data.window.startIso ||
                    $.str(body, "$.end") !== data.window.endIso ||
                    $.str(body, "$.currency") !== "USD" ||
                    $.str(body, "$.state") !== "final" ||
                    $.str(body, "$.storage.state") !== "final"
                ) {
                    throw new Error(
                        "Inbox cost window is not final or does not match the requested window",
                    );
                }
                const amount = $.str(body, "$.storage.posted_amount");
                if (
                    !/^\d+\.\d{6}$/.test(amount) ||
                    !Number.isFinite(Number(amount))
                ) throw new Error("Invalid posted inbox cost");
                return {
                    consumes: { credit: "default", amount: Number(amount) },
                };
            },
        },
    },
    lifecycle: {
        verify: async ({ data, utils }) => {
            const res = await utils.http({
                method: "GET",
                path: "/api/v1/mailboxes/" +
                    encodeURIComponent(data.resource.externalId),
            });
            if (res.status === 404) {
                return { active: false, inactiveReason: "http_404" };
            }
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "Inbox verification failed: HTTP " + res.status,
                );
            }
            return { active: true };
        },
        release: async ({ data, utils }) => {
            const res = await utils.http({
                method: "DELETE",
                path: "/api/v1/mailboxes/" +
                    encodeURIComponent(data.resource.externalId),
            });
            if (
                !(res.status >= 200 && res.status < 300) &&
                res.status !== 404 && res.status !== 410
            ) {
                throw new Error("Inbox release failed: HTTP " + res.status);
            }
            return { released: true };
        },
        refresh: async ({ data, utils }) => {
            const res = await utils.http({
                method: "GET",
                path: "/api/v1/mailboxes/" +
                    encodeURIComponent(data.resource.externalId),
            });
            if (res.status === 404) return { active: false };
            if (res.status !== 200) {
                throw new Error("Inbox refresh failed: HTTP " + res.status);
            }
            return {
                active: true,
                patch: { email: utils.json.str(res.body, "$.data.email") },
            };
        },
    },
});
