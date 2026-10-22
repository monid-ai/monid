import { assertEquals, assertRejects } from "@std/assert";
import type { Json, RunInput } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { fixtureReader, testSealedUnit } from "@shared/testing";

interface EndpointCase {
    id: string;
    method: string;
    path: string;
    input?: RunInput;
    response: Json;
    invalid?: RunInput[];
}

const mailboxId = "mbx_owned";
const message = { message_id: "msg_1" };
const folder = { folder_id: "folder_1" };
const draft = { draftId: "draft_1" };
const attachment = { ...message, attachment_id: "att_1" };
const page = {
    ok: true,
    data: [{ id: "item_1" }],
    pagination: { has_more: true, next_cursor: "cursor_2" },
};
const upload = {
    filename: "note.txt",
    content_type: "text/plain",
    size_bytes: 7_500_000,
};

// Removing a binding leaks the foreign selector; changing a route breaks the
// native request, and relaxing a cap lets invalid input reach the provider.
const cases: EndpointCase[] = [
    {
        id: "sendmux#list-drafts",
        method: "GET",
        path: "/mailbox/drafts",
        input: { queryParams: { limit: 100, cursor: "cursor_1" } },
        response: page,
        invalid: [
            { queryParams: { limit: 0 } },
            { queryParams: { limit: 101 } },
        ],
    },
    {
        id: "sendmux#get-draft",
        method: "GET",
        path: "/mailbox/drafts/draft_1",
        input: { pathParams: draft },
        response: {
            ok: true,
            data: { id: "draft_1", revision: 2, status: "ready" },
        },
        invalid: [{ pathParams: { draftId: "x".repeat(256) } }],
    },
    {
        id: "sendmux#delete-draft",
        method: "DELETE",
        path: "/mailbox/drafts/draft_1",
        input: { pathParams: draft },
        response: { ok: true, data: { id: "draft_1", deleted: true } },
    },
    {
        id: "sendmux#mailbox/attachment-uploads",
        method: "POST",
        path: "/mailbox/attachment-uploads",
        input: { body: upload },
        response: { ok: true, data: { blob_id: "blob_1" } },
        invalid: [
            { body: { ...upload, size_bytes: 0 } },
            { body: { ...upload, size_bytes: 7_500_001 } },
            { body: { ...upload, filename: "x".repeat(256) } },
            { body: { ...upload, content_type: "x".repeat(256) } },
        ],
    },
    {
        id: "sendmux#get-message",
        method: "GET",
        path: "/mailbox/messages/msg_1",
        input: { pathParams: message },
        response: { ok: true, data: { id: "msg_1", subject: "Invoice" } },
        invalid: [{ pathParams: { message_id: "x".repeat(256) } }],
    },
    {
        id: "sendmux#message-content",
        method: "GET",
        path: "/mailbox/messages/msg_1/content",
        input: {
            pathParams: message,
            queryParams: {
                part: "text",
                max_body_chars: 1_000_000,
                include_headers: "selected",
                include_attachments: "metadata",
                strip_signature: "true",
                strip_quotes: "false",
                include_links: "true",
                include_html: "false",
            },
        },
        response: { ok: true, data: { id: "msg_1", text_body: "Invoice" } },
        invalid: [
            { queryParams: { max_body_chars: 0 } },
            { queryParams: { max_body_chars: 1_000_001 } },
            { queryParams: { part: "all" } },
            { queryParams: { strip_quotes: true } },
        ],
    },
    {
        id: "sendmux#mailbox/messages/{message_id}/raw",
        method: "GET",
        path: "/mailbox/messages/msg_1/raw",
        input: { pathParams: message },
        response:
            "Subject: Invoice\r\nContent-Type: text/plain\r\n\r\nInvoice\r\n",
    },
    {
        id: "sendmux#get-thread",
        method: "GET",
        path: "/mailbox/threads/thread_1",
        input: { pathParams: { thread_id: "thread_1" } },
        response: { ok: true, data: { id: "thread_1" } },
        invalid: [{ pathParams: { thread_id: "x".repeat(256) } }],
    },
    {
        id: "sendmux#thread-messages",
        method: "GET",
        path: "/mailbox/threads/thread_1/messages",
        input: {
            pathParams: { thread_id: "thread_1" },
            queryParams: { limit: 100, cursor: "cursor_1", sort: "asc" },
        },
        response: page,
        invalid: [
            { queryParams: { limit: 0 } },
            { queryParams: { limit: 101 } },
            { queryParams: { sort: "newest" } },
        ],
    },
    {
        id: "sendmux#list-labels",
        method: "GET",
        path: "/mailbox/folders",
        input: { queryParams: { limit: 100, cursor: "cursor_1" } },
        response: page,
        invalid: [
            { queryParams: { limit: 0 } },
            { queryParams: { limit: 101 } },
        ],
    },
    {
        id: "sendmux#get-label",
        method: "GET",
        path: "/mailbox/folders/folder_1",
        input: { pathParams: folder },
        response: { ok: true, data: { id: "folder_1", name: "Invoices" } },
        invalid: [{ pathParams: { folder_id: "x".repeat(256) } }],
    },
    {
        id: "sendmux#create-label",
        method: "POST",
        path: "/mailbox/folders",
        input: {
            body: { name: "Invoices", parent_id: null, sort_order: 999_999 },
        },
        response: { ok: true, data: { id: "folder_1", name: "Invoices" } },
        invalid: [
            { body: { name: "" } },
            { body: { name: "x".repeat(256) } },
            { body: { name: "Invoices", sort_order: 1_000_000 } },
            { body: { name: "Invoices", parent_id: "x".repeat(256) } },
        ],
    },
    {
        id: "sendmux#update-label",
        method: "PATCH",
        path: "/mailbox/folders/folder_1",
        input: {
            pathParams: folder,
            body: { name: "Paid invoices", parent_id: null, sort_order: 0 },
        },
        response: { ok: true, data: { id: "folder_1", name: "Paid invoices" } },
        invalid: [
            { body: { name: "x".repeat(256) } },
            { body: { sort_order: -1 } },
            { body: { parent_id: "x".repeat(256) } },
        ],
    },
    {
        id: "sendmux#delete-label",
        method: "DELETE",
        path: "/mailbox/folders/folder_1",
        input: { pathParams: folder },
        response: { ok: true, data: { id: "folder_1", deleted: true } },
    },
    {
        id: "sendmux#update-message-labels",
        method: "PATCH",
        path: "/mailbox/messages/msg_1",
        input: {
            pathParams: message,
            body: { seen: true, flagged: false, keywords: { invoices: true } },
        },
        response: { ok: true, data: { id: "msg_1" } },
        invalid: [
            { body: { seen: "true" } },
            { body: { keywords: { ["x".repeat(256)]: true } } },
        ],
    },
    {
        id: "sendmux#attachment-text",
        method: "GET",
        path: "/mailbox/messages/msg_1/attachments/att_1/text",
        input: {
            pathParams: attachment,
            queryParams: { max_bytes: 1_048_576 },
        },
        response: { ok: true, data: { text: "Invoice" } },
        invalid: [
            { queryParams: { max_bytes: 0 } },
            { queryParams: { max_bytes: 1_048_577 } },
            { pathParams: { ...attachment, attachment_id: "x".repeat(256) } },
        ],
    },
    {
        id: "sendmux#request-attachment-text",
        method: "POST",
        path: "/mailbox/messages/msg_1/attachments/att_1/text",
        input: {
            pathParams: attachment,
            queryParams: { max_bytes: 1_048_576 },
        },
        response: { ok: true, data: { status: "pending" } },
        invalid: [
            { queryParams: { max_bytes: 0 } },
            { queryParams: { max_bytes: 1_048_577 } },
        ],
    },
];

for (const entry of cases) {
    Deno.test(
        entry.id + " preserves native IO, bounds and ownership",
        async () => {
            const input: RunInput = {
                ...entry.input,
                queryParams: {
                    mailbox_id: mailboxId,
                    ...entry.input?.queryParams,
                },
            };
            let calls = 0;
            const engine = new Engine({
                transport: directTransport({
                    params: () => Promise.resolve({ apiKey: "test-key" }),
                    fetch: (request, init) => {
                        calls++;
                        const url = new URL(String(request));
                        assertEquals(url.origin, "https://app.sendmux.ai");
                        assertEquals(url.pathname, "/api/v1" + entry.path);
                        assertEquals(init?.method, entry.method);
                        assertEquals(
                            Object.fromEntries(url.searchParams),
                            Object.fromEntries(
                                Object.entries(input.queryParams!)
                                    .map((
                                        [key, value],
                                    ) => [key, String(value)]),
                            ),
                        );
                        assertEquals(
                            init?.body === undefined
                                ? undefined
                                : JSON.parse(String(init.body)),
                            input.body,
                        );
                        return Promise.resolve(
                            typeof entry.response === "string"
                                ? new Response(entry.response, {
                                    headers: {
                                        "Content-Type": "message/rfc822",
                                    },
                                })
                                : Response.json(entry.response),
                        );
                    },
                }),
                resources: fixtureReader([{
                    resource: "sendmux/mailbox",
                    externalId: mailboxId,
                    data: { email: "agent@example.com" },
                }]),
                scopeKey: "test-scope",
            });
            const loaded = await engine.load(await testSealedUnit(entry.id));
            const result = await loaded.run(input);
            assertEquals(result.httpStatus, 200);
            assertEquals(result.output, entry.response);
            assertEquals(result.usage.credits, {});
            const beforeDenied = calls;
            for (const invalid of entry.invalid ?? []) {
                await assertRejects(
                    () =>
                        loaded.run({
                            ...input,
                            ...invalid,
                            queryParams: {
                                ...input.queryParams,
                                ...invalid.queryParams,
                            },
                        }),
                    Error,
                    "INVALID_INPUT",
                );
            }
            const foreign = await loaded.run({
                ...input,
                queryParams: {
                    ...input.queryParams,
                    mailbox_id: "mbx_foreign",
                },
            });
            assertEquals(foreign.httpStatus, 404);
            assertEquals(foreign.usage.credits, {});
            assertEquals(calls, beforeDenied);
        },
    );
}

Deno.test("sendmux foreign message keeps its owned selector and stops at native 404", async () => {
    let calls = 0;
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (request, init) => {
                calls++;
                assertEquals(init?.method, "GET");
                assertEquals(
                    String(request),
                    "https://app.sendmux.ai/api/v1/mailbox/messages/msg_foreign?mailbox_id=mbx_owned",
                );
                return Promise.resolve(
                    Response.json({ ok: false, error: { code: "not_found" } }, {
                        status: 404,
                    }),
                );
            },
        }),
        resources: fixtureReader([{
            resource: "sendmux/mailbox",
            externalId: mailboxId,
            data: { email: "agent@example.com" },
        }]),
    });
    const loaded = await engine.load(
        await testSealedUnit("sendmux#get-message"),
    );
    const result = await loaded.run({
        pathParams: { message_id: "msg_foreign" },
        queryParams: { mailbox_id: mailboxId },
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage.credits, {});
    assertEquals(calls, 1);
    assertEquals(
        (await loaded.run({
            pathParams: { message_id: "msg_foreign" },
            queryParams: { mailbox_id: "mbx_foreign" },
        })).httpStatus,
        404,
    );
    assertEquals(calls, 1);
});

Deno.test("sendmux source drafts preserve every native field and action within bounds", async () => {
    const address = { email: "recipient@example.com", name: "Recipient" };
    const fields = {
        from: { email: "agent@example.com", name: null },
        to: [address],
        cc: [address],
        bcc: [address],
        reply_to: [address],
        subject: "Invoice",
        text_body: "Invoice\r\n",
        html_body: "<p>Invoice</p>",
        custom_headers: { "X-Reference": "invoice_1" },
        attachments: [{
            blob_id: "blob_1",
            filename: "invoice.pdf",
            content_type: "application/pdf",
            size_bytes: 7_500_000,
            disposition: "inline",
            content_id: "invoice_1",
        }],
    };
    let calls = 0;
    let expectedBody: Json = fields;
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (request, init) => {
                calls++;
                assertEquals(init?.method, "POST");
                assertEquals(
                    String(request),
                    "https://app.sendmux.ai/api/v1/mailbox/drafts?mailbox_id=mbx_owned",
                );
                assertEquals(JSON.parse(String(init?.body)), expectedBody);
                return Promise.resolve(Response.json({
                    ok: true,
                    data: { id: "draft_1", revision: 1, status: "ready" },
                }, { status: 201 }));
            },
        }),
        resources: fixtureReader([{
            resource: "sendmux/mailbox",
            externalId: mailboxId,
            data: { email: "agent@example.com" },
        }]),
    });
    const loaded = await engine.load(
        await testSealedUnit("sendmux#create-draft"),
    );
    for (const action of ["reply", "reply_all", "forward", "adopt"]) {
        expectedBody = { ...fields, source: { message_id: "msg_1", action } };
        const result = await loaded.run({
            queryParams: { mailbox_id: mailboxId },
            body: expectedBody,
        });
        assertEquals(result.httpStatus, 201);
        assertEquals(result.usage.credits, {});
    }
    assertEquals(calls, 4);
    const invalidFields: Json[] = [
        { from: { email: "invalid" } },
        { from: { ...address, name: "x".repeat(256) } },
        ...["to", "cc", "bcc"].map((key) => ({
            [key]: Array(51).fill(address),
        })),
        { reply_to: Array(21).fill(address) },
        { subject: "x".repeat(999) },
        { text_body: "x".repeat(1_000_001) },
        { html_body: "x".repeat(1_000_001) },
        { custom_headers: { Reference: "invalid" } },
        { custom_headers: { "X-Reference": "x".repeat(999) } },
        { attachments: Array(11).fill(fields.attachments[0]) },
        { attachments: [{ ...fields.attachments[0], size_bytes: 7_500_001 }] },
        { source: { message_id: "msg_1", action: "link" } },
        { source: { message_id: "x".repeat(256), action: "reply" } },
    ];
    for (const body of invalidFields) {
        await assertRejects(
            () => loaded.run({ queryParams: { mailbox_id: mailboxId }, body }),
            Error,
            "INVALID_INPUT",
        );
    }
    assertEquals(
        (await loaded.run({
            queryParams: { mailbox_id: "mbx_foreign" },
            body: fields,
        })).httpStatus,
        404,
    );
    assertEquals(calls, 4);
});

Deno.test("sendmux#release-mailbox emits an owned release without immediate deletion", async () => {
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => {
                throw new Error(
                    "Release request must leave deletion to the host",
                );
            },
        }),
        resources: fixtureReader([{
            resource: "sendmux/mailbox",
            externalId: mailboxId,
            data: { email: "agent@example.com" },
        }]),
        scopeKey: "test-scope",
    });
    const loaded = await engine.load(
        await testSealedUnit("sendmux#release-mailbox"),
    );
    const result = await loaded.run({ body: { public_id: mailboxId } });
    assertEquals(result.httpStatus, 202);
    assertEquals(result.output, { id: mailboxId, status: "release_requested" });
    assertEquals(result.resources?.releases, [{
        resource: "sendmux/mailbox",
        externalId: mailboxId,
    }]);
    assertEquals(result.usage.credits, {});
    assertEquals(
        (await loaded.run({ body: { public_id: "mbx_foreign" } })).httpStatus,
        404,
    );
    await assertRejects(
        () => loaded.run({ body: { public_id: "" } }),
        Error,
        "INVALID_INPUT",
    );
});
