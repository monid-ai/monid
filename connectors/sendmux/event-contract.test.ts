import { assertEquals } from "@std/assert";
import { type Json, sealProviderUnit, type WebhookRouteFn } from "@shared/core";
import { testBundle } from "@shared/testing";
import { fnUtils, instantiate } from "@monid/connector-engine";
import { checkDelivery, sign } from "../../scripts/webhook.ts";

const AT = new Date("2026-09-30T00:00:00.000Z");
const SECRET = "test-secret";
const RAW =
    '{"id":"evt_1","type":"message.received","data":{"mailbox_id":"mbx_owned"}}';

async function compiledHook() {
    const unit = sealProviderUnit(await testBundle(), "sendmux");
    const hook = unit.doc.webhooks!["mailbox-events"];
    const route = instantiate(
        unit.fns[hook.route.$fn.key],
        hook.route,
        "sendmux#webhooks.mailbox-events.route",
    ) as WebhookRouteFn;
    return { verify: hook.verify, route };
}

function delivery(body: Json) {
    return {
        data: { delivery: { headers: {}, body } },
        utils: fnUtils,
        logger: { debug() {}, info() {}, warn() {}, error() {} },
    };
}

// Build the native envelope independently: a shared sign/check bug must fail.
async function wireHeaders({ rawBody, timestamp }: {
    rawBody: string;
    timestamp: string;
}) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const bytes = new Uint8Array(
        await crypto.subtle.sign(
            "HMAC",
            key,
            new TextEncoder().encode(timestamp + "." + rawBody),
        ),
    );
    const signature = [...bytes].map((byte) =>
        byte.toString(16).padStart(2, "0")
    ).join("");
    return {
        "x-sendmux-timestamp": timestamp,
        "x-sendmux-signature-v2": "v1=" + signature,
    };
}

Deno.test("sendmux compiled webhook routes inbox refreshes and delivery ignores without claiming ownership", async () => {
    const { route } = await compiledHook();
    for (const mailboxId of ["mbx_owned", "mbx_foreign"]) {
        const target = { resource: "sendmux/mailbox", externalId: mailboxId };
        for (const type of ["message.received", "message.received.spam"]) {
            const body = {
                id: "evt_stable",
                type,
                data: { mailbox_id: mailboxId },
            };
            const expected = {
                who: { kind: "resource", target },
                what: { action: "refresh", target },
            } as const;
            assertEquals(route(delivery(body)), expected);
            assertEquals(route(delivery(body)), expected);
        }
        for (
            const type of [
                "message.delivered",
                "message.bounced",
                "message.complained",
                "message.rejected",
                "message.delivery_delayed",
                "sendmux.test",
            ]
        ) {
            assertEquals(
                route(delivery({ type, data: { mailbox_id: mailboxId } })),
                {
                    who: { kind: "resource", target },
                    what: { action: "ignore" },
                },
            );
        }
    }
    const missingTargets: Json[] = [
        { type: "message.received" },
        { type: "message.received", data: {} },
        { type: "message.received", data: { mailbox_id: null } },
        { type: "message.received", data: { mailbox_id: "" } },
        { type: "message.received", data: { mailbox_id: 1 } },
    ];
    for (const body of missingTargets) {
        assertEquals(route(delivery(body)), {
            who: { kind: "unhandled", event: "message.received" },
            what: { action: "ignore" },
        });
    }
    assertEquals(route(delivery({})), {
        who: { kind: "unhandled", event: "unknown" },
        what: { action: "ignore" },
    });
});

Deno.test("sendmux event signatures match native headers and enforce both freshness boundaries", async () => {
    const { verify } = await compiledHook();
    const timestamp = String(AT.getTime() / 1000);
    const headers = await wireHeaders({ rawBody: RAW, timestamp });
    assertEquals(await sign(verify, SECRET, RAW, AT), headers);
    for (const offset of [-300_000, 0, 300_000]) {
        assertEquals(
            await checkDelivery(
                verify,
                SECRET,
                headers,
                RAW,
                new Date(AT.getTime() + offset),
            ),
            { ok: true },
        );
    }
    for (const offset of [-300_001, 300_001]) {
        assertEquals(
            (await checkDelivery(
                verify,
                SECRET,
                headers,
                RAW,
                new Date(AT.getTime() + offset),
            )).ok,
            false,
        );
    }
    const retryAt = new Date(AT.getTime() + 1000);
    const retryHeaders = await wireHeaders({
        rawBody: RAW,
        timestamp: String(retryAt.getTime() / 1000),
    });
    assertEquals(await sign(verify, SECRET, RAW, retryAt), retryHeaders);
    assertEquals(
        await checkDelivery(verify, SECRET, retryHeaders, RAW, retryAt),
        { ok: true },
    );
});

Deno.test("sendmux event verification rejects changed raw bodies and invalid header envelopes", async () => {
    const { verify } = await compiledHook();
    const headers = await wireHeaders({
        rawBody: RAW,
        timestamp: String(AT.getTime() / 1000),
    });
    assertEquals(await checkDelivery(verify, SECRET, headers, RAW, AT), {
        ok: true,
    });
    const missingTimestamp: Record<string, string> = { ...headers };
    delete missingTimestamp["x-sendmux-timestamp"];
    const missingSignature: Record<string, string> = { ...headers };
    delete missingSignature["x-sendmux-signature-v2"];
    const legacyOnly = {
        "x-sendmux-timestamp": headers["x-sendmux-timestamp"],
        "x-sendmux-signature": "sha256=" +
            headers["x-sendmux-signature-v2"].slice(3),
    };
    const invalidTimestamp = await wireHeaders({
        rawBody: RAW,
        timestamp: "not-a-timestamp",
    });
    const cases: Array<{
        headers: Record<string, string>;
        rawBody: string;
        secret: string;
    }> = [
        { headers, rawBody: RAW + " ", secret: SECRET },
        { headers, rawBody: RAW.replace("evt_1", "evt_2"), secret: SECRET },
        { headers, rawBody: RAW, secret: "wrong-secret" },
        { headers: missingTimestamp, rawBody: RAW, secret: SECRET },
        { headers: missingSignature, rawBody: RAW, secret: SECRET },
        { headers: legacyOnly, rawBody: RAW, secret: SECRET },
        { headers: invalidTimestamp, rawBody: RAW, secret: SECRET },
        {
            headers: {
                ...headers,
                "x-sendmux-timestamp": String(AT.getTime() / 1000 + 1),
            },
            rawBody: RAW,
            secret: SECRET,
        },
        {
            headers: {
                ...headers,
                "x-sendmux-signature-v2": headers["x-sendmux-signature-v2"]
                    .slice(3),
            },
            rawBody: RAW,
            secret: SECRET,
        },
    ];
    for (const value of cases) {
        assertEquals(
            (await checkDelivery(
                verify,
                value.secret,
                value.headers,
                value.rawBody,
                AT,
            )).ok,
            false,
        );
    }
});
