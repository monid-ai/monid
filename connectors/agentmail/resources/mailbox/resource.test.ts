import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { loadResource, testResourceUnit } from "@shared/testing";
import { fixture, MAILBOX } from "../../test-data.ts";

const ID = "agentmail/mailbox";

async function resourceReply(status: number, body: Json) {
    return await resourceResponses([{ status, body }]);
}

async function resourceResponses(replies: { status: number; body: Json }[]) {
    const calls: { url: string; method: string }[] = [];
    const resource = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                const reply = replies[calls.length];
                if (!reply) throw new Error("unexpected resource request");
                const { status, body } = reply;
                calls.push({ url: String(url), method: init?.method ?? "GET" });
                return Promise.resolve(
                    new Response(status === 204 ? null : JSON.stringify(body), {
                        status,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    }).loadResource(await testResourceUnit(ID));
    return { resource, calls };
}

Deno.test(`${ID}: monthly rent and storage have separate rate-card lines`, async () => {
    const unit = await testResourceUnit(ID);
    assertEquals(unit.doc.usage, {
        period: { unit: "MONTH", count: 1, anchor: "CREATION_TIME" },
        lines: {
            rent: { consumes: { credit: "default", amount: 1 } },
            storage: {
                price: {
                    unit: "GB_MONTH",
                    every: 1,
                    consumes: { credit: "default", amount: 1 },
                },
            },
        },
    });
    assertEquals(Object.keys(unit.doc.reconcileUsage ?? {}), ["storage"]);
    assertEquals(unit.doc.reconcileUsage?.storage.everyMs, 86_400_000);
    assertEquals(unit.doc.minEngineVersion, "0.6.0");
});

Deno.test(`${ID}: verifies an existing mailbox using its distinct native ID`, async () => {
    const resource = await loadResource({
        unit: await testResourceUnit(ID),
        mode: "replay",
        fixture: await fixture("synthetic-mailbox-read"),
    });
    assertEquals(await resource.verify(MAILBOX), { active: true });
});

Deno.test(`${ID}: paused is an existing resource, not a reason to stop rent`, async () => {
    const f = await fixture("synthetic-mailbox-read");
    const body = {
        ...f.calls[0].res.body as Record<string, Json>,
        status: "paused",
    };
    const { resource } = await resourceReply(200, body);
    assertEquals(await resource.verify(MAILBOX), { active: true });
});

Deno.test(`${ID}: confirmed absence differs from a transient or malformed verification`, async () => {
    const missing = await resourceReply(404, { error: "not_found" });
    assertEquals(await missing.resource.verify(MAILBOX), {
        active: false,
        inactiveReason: "http_404",
    });
    const transient = await resourceReply(503, { error: "unavailable" });
    await assertRejects(
        () => transient.resource.verify(MAILBOX),
        Error,
        "RESOURCE_OP_FAILED",
    );
    const deleting = await resourceReply(409, {
        code: "resource_deleting",
        message: "Inbox is being deleted",
    });
    await assertRejects(
        () => deleting.resource.verify(MAILBOX),
        Error,
        "RESOURCE_OP_FAILED",
    );
    const malformed = await resourceReply(200, {
        inbox_id: "another",
        email: MAILBOX.externalId,
    });
    await assertRejects(
        () => malformed.resource.verify(MAILBOX),
        Error,
        "RESOURCE_OP_FAILED",
    );
});

Deno.test(`${ID}: refresh updates display data while keeping the stable identity`, async () => {
    const f = await fixture("synthetic-mailbox-read");
    f.calls[0].res.body = {
        inbox_id: "mbx-1",
        email: MAILBOX.externalId,
        display_name: "New Name",
        status: "paused",
    };
    const resource = await loadResource({
        unit: await testResourceUnit(ID),
        mode: "replay",
        fixture: f,
    });
    assertEquals(await resource.refresh(MAILBOX), {
        active: true,
        patch: {
            upstreamInboxId: "mbx-1",
            email: MAILBOX.externalId,
            displayName: "New Name",
            createdAt: "2026-10-27T00:00:00Z",
            status: "paused",
        },
    });
    const cleared = await resourceReply(200, {
        inbox_id: "mbx-1",
        email: MAILBOX.externalId,
    });
    assertEquals(await cleared.resource.refresh(MAILBOX), {
        active: true,
        patch: {
            upstreamInboxId: "mbx-1",
            email: MAILBOX.externalId,
            createdAt: "2026-10-27T00:00:00Z",
        },
    });
});

Deno.test(`${ID}: refresh never erases an inbox after a transient/invalid response`, async () => {
    const missing = await resourceReply(404, {});
    assertEquals(await missing.resource.refresh(MAILBOX), { active: false });
    for (
        const [status, body] of [[503, {}], [200, {
            inbox_id: "mbx-1",
            email: "other@example.test",
        }]] as const
    ) {
        const { resource } = await resourceReply(status, body);
        await assertRejects(
            () => resource.refresh(MAILBOX),
            Error,
            "RESOURCE_OP_FAILED",
        );
    }
});

Deno.test(`${ID}: release verifies identity and tolerates a terminal DELETE or already absent inbox`, async () => {
    const existing = {
        status: 200,
        body: { inbox_id: "mbx-1", email: MAILBOX.externalId },
    };
    for (const status of [200, 204, 404, 410]) {
        const { resource, calls } = await resourceResponses([
            existing,
            { status, body: null },
        ]);
        assertEquals(await resource.release(MAILBOX), { released: true });
        assertEquals(calls.map((c) => c.method), ["GET", "DELETE"]);
        assertEquals(
            calls.every((c) =>
                c.url === "https://api.agentmail.to/v0/inboxes/mbx-1"
            ),
            true,
        );
    }
    for (const status of [404, 410]) {
        const { resource, calls } = await resourceReply(status, {});
        assertEquals(await resource.release(MAILBOX), { released: true });
        assertEquals(calls.map((c) => c.method), ["GET"]);
    }
    const transient = await resourceResponses([
        existing,
        { status: 503, body: {} },
    ]);
    await assertRejects(
        () => transient.resource.release(MAILBOX),
        Error,
        "RESOURCE_OP_FAILED",
    );
});

Deno.test(`${ID}: asynchronous DELETE acceptance retries until teardown is confirmed`, async () => {
    const existing = {
        status: 200,
        body: { inbox_id: "mbx-1", email: MAILBOX.externalId },
    };
    for (const status of [200, 409, 503]) {
        const pending = await resourceResponses([
            existing,
            { status: 202, body: null },
            { status, body: {} },
        ]);
        await assertRejects(
            () => pending.resource.release(MAILBOX),
            Error,
            "RESOURCE_OP_FAILED",
        );
        assertEquals(pending.calls.map((c) => c.method), [
            "GET",
            "DELETE",
            "GET",
        ]);
    }
    for (const status of [404, 410]) {
        const complete = await resourceResponses([
            existing,
            { status: 202, body: null },
            { status, body: {} },
        ]);
        assertEquals(await complete.resource.release(MAILBOX), {
            released: true,
        });
        assertEquals(complete.calls.map((c) => c.method), [
            "GET",
            "DELETE",
            "GET",
        ]);
    }
    const deleting = await resourceReply(409, {
        code: "resource_deleting",
        message: "Inbox is being deleted",
    });
    await assertRejects(
        () => deleting.resource.release(MAILBOX),
        Error,
        "RESOURCE_OP_FAILED",
    );
    const complete = await resourceReply(404, { code: "not_found" });
    assertEquals(await complete.resource.release(MAILBOX), { released: true });
    assertEquals(complete.calls.map((c) => c.method), ["GET"]);
});

Deno.test(`${ID}: release refuses unreadable or mismatched native identity before DELETE`, async () => {
    for (
        const body of [{}, {
            inbox_id: "other",
            email: MAILBOX.externalId,
        }] as Json[]
    ) {
        const { resource, calls } = await resourceReply(200, body);
        await assertRejects(
            () => resource.release(MAILBOX),
            Error,
            "RESOURCE_OP_FAILED",
        );
        assertEquals(calls.map((c) => c.method), ["GET"]);
    }
});

Deno.test(`${ID}: malformed host data and foreign kinds fail before any wire call`, async () => {
    const resource = await loadResource({
        unit: await testResourceUnit(ID),
        mode: "replay",
    });
    await assertRejects(
        () => resource.verify({ ...MAILBOX, resource: "agentmail/other" }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            resource.verify({
                ...MAILBOX,
                data: { email: MAILBOX.externalId },
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            resource.verify({
                ...MAILBOX,
                data: { email: MAILBOX.externalId, upstreamInboxId: ".." },
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            resource.release({ ...MAILBOX, externalId: "other@example.test" }),
        Error,
        "RESOURCE_OP_FAILED",
    );
});
