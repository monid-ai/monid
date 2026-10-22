import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, type OwnedResource, sealProviderUnit } from "@shared/core";
import { fnUtils } from "@monid/connector-engine";
import {
    fixtureReader,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";
import provider from "./provider.ts";
import { checkDelivery, sign } from "../../scripts/webhook.ts";

const HERE = fromFileUrl(new URL("./", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);
const OWNED: OwnedResource[] = [{
    resource: "sendmux/mailbox",
    externalId: "mbx_owned",
    data: { email: "agent@example.com" },
}];

Deno.test("sendmux provisions one owned inbox without exposing a child credential", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("sendmux#mailboxes"),
        input: { body: { email: "agent@example.com" } },
        mode: "replay",
        fixture: await fixture("synthetic-create-mailbox"),
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.resources?.provisions?.[0], {
        resource: "sendmux/mailbox",
        externalId: "mbx_owned",
        identifier: "agent@example.com",
        data: { email: "agent@example.com" },
    });
    assertEquals(
        (result.output as Record<string, unknown>).credential,
        undefined,
    );
});

Deno.test("sendmux provision retry keeps the host run's idempotency key", async () => {
    const keys: string[] = [];
    const transport = directTransport({
        params: () => Promise.resolve({ apiKey: "test-key" }),
        fetch: (request, init) => {
            if (String(request).endsWith("/mailbox/connection")) {
                return Promise.resolve(
                    Response.json({
                        ok: true,
                        data: { credential: { type: "api_key" } },
                    }),
                );
            }
            keys.push(new Headers(init?.headers).get("Idempotency-Key") ?? "");
            if (keys.length === 1) {
                return Promise.reject(new Error("response lost"));
            }
            return Promise.resolve(Response.json({
                ok: true,
                data: {
                    mailbox: { id: "mbx_owned", email: "agent@example.com" },
                    credential: null,
                    warning: null,
                },
            }, { status: 201 }));
        },
    });
    const engine = new Engine({
        transport,
        resources: fixtureReader([]),
        scopeKey: "test-scope",
    });
    const loaded = await engine.load(await testSealedUnit("sendmux#mailboxes"));
    const input = { body: { email: "agent@example.com" } };
    await assertRejects(() => loaded.start(input, { runId: "run_1" }));
    const result = await loaded.start(input, { runId: "run_1" });
    assertEquals(result.kind, "COMPLETED");
    assertEquals(keys, ["run_1", "run_1"]);
});

Deno.test("sendmux provision rejects a credential without mailbox access before create", async () => {
    const calls: string[] = [];
    const transport = directTransport({
        params: () => Promise.resolve({ apiKey: "test-key" }),
        fetch: (request) => {
            calls.push(String(request));
            return Promise.resolve(Response.json(
                { ok: false, error: { code: "insufficient_permissions" } },
                { status: 403 },
            ));
        },
    });
    const engine = new Engine({
        transport,
        resources: fixtureReader([]),
        scopeKey: "test-scope",
    });
    const loaded = await engine.load(await testSealedUnit("sendmux#mailboxes"));
    const result = await loaded.start(
        { body: { email: "agent@example.com" } },
        { runId: "run_1" },
    );
    assertEquals(result.kind, "COMPLETED");
    assertEquals(calls, ["https://app.sendmux.ai/api/v1/mailbox/connection"]);
});

Deno.test("sendmux denies foreign mailbox before an upstream request", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("sendmux#mailboxes/{public_id}"),
        input: { pathParams: { public_id: "mbx_foreign" } },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage.credits, {});
});

Deno.test("sendmux owned mailbox read keeps the resource selector", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("sendmux#mailboxes/{public_id}"),
        input: { pathParams: { public_id: "mbx_owned" } },
        mode: "replay",
        resources: OWNED,
        fixture: await fixture("synthetic-read-mailbox"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals((result.output as Record<string, unknown>).id, "mbx_owned");
});

Deno.test("sendmux draft source stays inside the owned inbox", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("sendmux#create-draft"),
        input: {
            queryParams: { mailbox_id: "mbx_owned" },
            body: {
                source: { message_id: "msg_1", action: "reply_all" },
                text_body: "Thanks",
            },
        },
        resources: OWNED,
        mode: "replay",
        fixture: await fixture("synthetic-draft-create"),
    });
    assertEquals(result.httpStatus, 201);
    assertEquals((result.output as Record<string, unknown>).data, {
        id: "draft_1",
        revision: 1,
        status: "ready",
    });
});

Deno.test("sendmux draft edit leaves a newer revision untouched", async () => {
    const requests: string[] = [];
    const transport = directTransport({
        params: () => Promise.resolve({ apiKey: "test-key" }),
        fetch: (request, init) => {
            requests.push(init?.method ?? "");
            assertEquals(
                String(request),
                "https://app.sendmux.ai/api/v1/mailbox/drafts/draft_1?mailbox_id=mbx_owned",
            );
            if (init?.method === "GET") {
                return Promise.resolve(Response.json(
                    { ok: true, data: { id: "draft_1", revision: 2 } },
                    { headers: { ETag: 'W/"current"' } },
                ));
            }
            assertEquals(
                init?.headers && new Headers(init.headers).get("If-Match"),
                'W/"current"',
            );
            return Promise.resolve(Response.json(
                {
                    ok: false,
                    error: {
                        code: "conflict",
                        message: "This draft has changed.",
                    },
                },
                { status: 409 },
            ));
        },
    });
    const engine = new Engine({
        transport,
        resources: fixtureReader(OWNED),
        scopeKey: "test-scope",
    });
    const loaded = await engine.load(
        await testSealedUnit("sendmux#update-draft"),
    );
    const result = await loaded.run({
        pathParams: { draftId: "draft_1" },
        queryParams: { mailbox_id: "mbx_owned" },
        body: { expected_revision: 1, text_body: "old edit" },
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.usage.credits, {});
    assertEquals(requests, ["GET", "PATCH"]);
});

Deno.test("sendmux draft send carries the reviewed revision without a second usage line", async () => {
    const unit = await testSealedUnit("sendmux#mailbox/drafts/{draftId}/send");
    const input = {
        pathParams: { draftId: "draft_1" },
        queryParams: { mailbox_id: "mbx_owned" },
        body: { expected_revision: 2 },
    };
    const result = await runEndpoint({
        unit,
        input,
        resources: OWNED,
        mode: "replay",
        fixture: await fixture("synthetic-draft-send-replay"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, {});
    const foreign = await runEndpoint({
        unit,
        input: { ...input, queryParams: { mailbox_id: "mbx_foreign" } },
        resources: OWNED,
        mode: "replay",
    });
    assertEquals(foreign.httpStatus, 404);
});

Deno.test("sendmux retry after a lost send response reuses the accepted draft revision", async () => {
    const requests: Array<{ url: string; body: string }> = [];
    let accepted = 0;
    const transport = directTransport({
        params: () => Promise.resolve({ apiKey: "test-key" }),
        fetch: (request, init) => {
            const url = String(request);
            const body = String(init?.body);
            requests.push({ url, body });
            const revision =
                (JSON.parse(body) as { expected_revision?: number })
                    .expected_revision;
            if (revision !== 2) {
                return Promise.resolve(Response.json(
                    { ok: false, error: { code: "conflict" } },
                    { status: 409 },
                ));
            }
            if (accepted === 0) {
                accepted++;
                return Promise.reject(
                    new Error("response lost after acceptance"),
                );
            }
            return Promise.resolve(Response.json({
                ok: true,
                data: { id: "draft_1", revision: 2, status: "sending" },
            }));
        },
    });
    const engine = new Engine({
        transport,
        resources: fixtureReader(OWNED),
        scopeKey: "test-scope",
    });
    const loaded = await engine.load(
        await testSealedUnit("sendmux#mailbox/drafts/{draftId}/send"),
    );
    const input = {
        pathParams: { draftId: "draft_1" },
        queryParams: { mailbox_id: "mbx_owned" },
        body: { expected_revision: 2 },
    };
    await assertRejects(() => loaded.run(input));
    const retry = await loaded.run(input);
    assertEquals(retry.httpStatus, 200);
    assertEquals(retry.usage.credits, {});
    assertEquals(accepted, 1);
    assertEquals(requests, [
        {
            url: "https://app.sendmux.ai/api/v1/mailbox/drafts/draft_1/send?mailbox_id=mbx_owned",
            body: '{"expected_revision":2}',
        },
        {
            url: "https://app.sendmux.ai/api/v1/mailbox/drafts/draft_1/send?mailbox_id=mbx_owned",
            body: '{"expected_revision":2}',
        },
    ]);
});

Deno.test("sendmux message search keeps the bounded page cursor", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("sendmux#list-messages"),
        input: {
            queryParams: { mailbox_id: "mbx_owned", limit: 2, q: "invoice" },
        },
        resources: OWNED,
        mode: "replay",
        fixture: await fixture("synthetic-message-page"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals((result.output as Record<string, Json>).pagination, {
        has_more: true,
        next_cursor: "cursor_2",
    });
});

Deno.test("sendmux attachment link stays scoped to an owned inbox", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("sendmux#attachment-download"),
        input: {
            pathParams: { message_id: "msg_1", attachment_id: "att_1" },
            queryParams: { mailbox_id: "mbx_owned" },
        },
        resources: OWNED,
        mode: "replay",
        fixture: await fixture("synthetic-attachment-link"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(
        (result.output as Record<string, Json>).download_url,
        "https://app.sendmux.ai/download/att_1?token=test",
    );
});

Deno.test("sendmux webhook routes signed mailbox events by owned public ID", () => {
    const hook = provider.webhooks!["mailbox-events"];
    assertEquals(hook.verify.signatureHeader, "x-sendmux-signature-v2");
    assertEquals(hook.verify.timestampHeader, "x-sendmux-timestamp");
    assertEquals(hook.verify.payload, "${timestamp}.${rawBody}");
    const delivery = (body: Json) => ({
        data: { delivery: { headers: {}, body } },
        utils: fnUtils,
        logger: { debug() {}, info() {}, warn() {}, error() {} },
    });
    assertEquals(
        hook.route(
            delivery({
                id: "evt_1",
                type: "message.received",
                data: { mailbox_id: "mbx_owned" },
            }),
        ),
        {
            who: {
                kind: "resource",
                target: {
                    resource: "sendmux/mailbox",
                    externalId: "mbx_owned",
                },
            },
            what: {
                action: "refresh",
                target: {
                    resource: "sendmux/mailbox",
                    externalId: "mbx_owned",
                },
            },
        },
    );
    assertEquals(
        hook.route(
            delivery({
                id: "evt_2",
                type: "message.bounced",
                data: { mailbox_id: null },
            }),
        ).who,
        {
            kind: "unhandled",
            event: "message.bounced",
        },
    );
});

Deno.test("sendmux webhook rejects a changed body and expired signature", async () => {
    const verify = sealProviderUnit(await testBundle(), "sendmux").doc
        .webhooks!["mailbox-events"].verify;
    const at = new Date("2026-09-30T00:00:00.000Z");
    const raw =
        '{"id":"evt_1","type":"message.received","data":{"mailbox_id":"mbx_owned"}}';
    const headers = await sign(verify, "test-secret", raw, at);
    assertEquals(await checkDelivery(verify, "test-secret", headers, raw, at), {
        ok: true,
    });
    assertEquals(
        (await checkDelivery(verify, "test-secret", headers, raw + " ", at)).ok,
        false,
    );
    assertEquals(
        (await checkDelivery(
            verify,
            "test-secret",
            headers,
            raw,
            new Date(at.getTime() + 300_001),
        )).ok,
        false,
    );
});
