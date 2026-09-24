import { assert, assertEquals, assertRejects } from "@std/assert";
import {
    directTransport,
    Engine,
    redactRunInput,
} from "@monid/connector-engine";
import { testBundle, testResourceUnit, testSealedUnit } from "@shared/testing";
import type { Json, OwnedResource, RunInput } from "@shared/core";
import { FileCredentialStore } from "../../scripts/store/credentials.ts";
import { catalog, coverage } from "./catalog.ts";

const KEY_A = "ak_synthetic_alpha";
const KEY_B = "ak_synthetic_beta";
const ID_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CODE = "ahc_" + "s".repeat(43);
const ORIGIN = "https://app.ambiguous.ai";

function identity(key: string) {
    return {
        id: key === KEY_A ? ID_A : ID_B,
        workspace_id: key === KEY_A ? ID_A : ID_B,
        workspace_name: key === KEY_A ? "Alpha" : "Beta",
        display_name: "Synthetic agent",
        type: "agent",
    };
}

async function withHosts(
    test: (
        a: Awaited<ReturnType<typeof host>>,
        b: Awaited<ReturnType<typeof host>>,
        directory: string,
    ) => Promise<void>,
) {
    const directory = await Deno.makeTempDir();
    const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
    try {
        await test(
            await host(directory, key, "alpha"),
            await host(directory, key, "beta"),
            directory,
        );
    } finally {
        await Deno.remove(directory, { recursive: true });
    }
}

async function host(directory: string, key: CryptoKey, scope: string) {
    const resources: OwnedResource[] = [];
    const credentials = new FileCredentialStore(directory, key, scope);
    const calls: {
        url: string;
        method: string;
        headers: Headers;
        body: unknown;
    }[] = [];
    let revoked = false;
    let codeUsed = false;
    const fetcher: typeof fetch = async (input, init) => {
        const url = String(input);
        const headers = new Headers(init?.headers);
        const body = typeof init?.body === "string"
            ? JSON.parse(init.body)
            : init?.body;
        calls.push({ url, method: init?.method ?? "GET", headers, body });
        if (url.endsWith("/api/auth/signup-agent")) {
            assertEquals(headers.get("authorization"), null);
            return Response.json({
                api_key: KEY_A,
                agent: { id: ID_A, display_name: "Synthetic agent" },
                workspace: { id: ID_A, name: "Alpha" },
                human: { claim_token_sent: true },
            }, { status: 201 });
        }
        if (url.endsWith("/api/auth/key-handoff/exchange")) {
            assertEquals(headers.get("authorization"), null);
            assertEquals(body, { code: CODE });
            if (codeUsed) {
                return Response.json({ token: KEY_B, error: "Expired code" }, {
                    status: 401,
                });
            }
            codeUsed = true;
            return Response.json({ token: KEY_B, display_name: null });
        }
        const token = headers.get("authorization")?.replace("Bearer ", "");
        assert(token === KEY_A || token === KEY_B);
        if (revoked) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (url.includes("/export")) {
            return new Response(new Uint8Array([0, 255, 128, 65]), {
                headers: {
                    "content-type": "application/pdf",
                    "content-disposition": "attachment; filename=export.pdf",
                },
            });
        }
        if (url.endsWith("/api/users/me")) {
            return Response.json(identity(token));
        }
        return Response.json({
            ok: true,
            body: body instanceof FormData
                ? "multipart received"
                : body ?? null,
        });
    };
    const transport = directTransport({ credentials, fetch: fetcher });
    const engine = new Engine({
        transport,
        resources: {
            owned: (query) =>
                Promise.resolve(
                    resources.filter((row) =>
                        row.resource === query.resource &&
                        (!query.externalId ||
                            query.externalId === row.externalId)
                    ),
                ),
        },
        scopeKey: scope,
    });
    const run = async (name: string, input: RunInput = {}) => {
        const result =
            await (await engine.load(await testSealedUnit(`ambiguous#${name}`)))
                .run(input);
        for (const seed of result.resources?.provisions ?? []) {
            resources.push({
                resource: seed.resource,
                externalId: seed.externalId,
                data: seed.data,
            });
        }
        for (const released of result.resources?.releases ?? []) {
            const index = resources.findIndex((row) =>
                row.externalId === released.externalId &&
                row.resource === released.resource
            );
            if (index >= 0) resources.splice(index, 1);
            await credentials.forget("ambiguous", ORIGIN, released.externalId);
        }
        return result;
    };
    return {
        run,
        engine,
        calls,
        resources,
        credentials,
        transport,
        revoke: () => {
            revoked = true;
        },
    };
}

Deno.test("ambiguous: every published MCP operation is registered with native method/path and ownership binding", async () => {
    const bundle = await testBundle();
    const expected = catalog.operations.map((operation) =>
        `ambiguous#${operation.operationId}`
    ).sort();
    const actual = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("ambiguous#") && !id.startsWith("ambiguous#connections/")
    ).sort();
    assertEquals(actual, expected);
    assertEquals(expected.length, coverage.filter((row) => row.exposed).length);
    const report = JSON.parse(
        await Deno.readTextFile(new URL("./coverage.json", import.meta.url)),
    );
    assertEquals(report.totalOperations, coverage.length);
    assertEquals(report.includedOperations, expected.length);
    assertEquals(
        report.notExposedToMcp.map((row: { operationId: string }) =>
            row.operationId
        ).sort(),
        coverage.filter((row) => !row.exposed).map((row) => row.operationId)
            .sort(),
    );
    for (const operation of catalog.operations) {
        const doc = bundle.endpoints[`ambiguous#${operation.operationId}`];
        assertEquals(doc.request.method, operation.method);
        assertEquals(doc.request.url, ORIGIN + operation.path);
        assertEquals(doc.auth.resource, "connection");
        assertEquals(
            doc.resources?.uses?.[0].key,
            "$.pathParams.monid_connection",
        );
        assertEquals(doc.request.responseEncoding, "auto");
        assertEquals(
            doc.request.bodyEncoding === "multipart",
            operation.multipart,
        );
        for (const slot of ["body", "queryParams", "headers"] as const) {
            assertEquals(
                Boolean(doc.input.schema[slot]),
                Boolean(operation.inputs[slot]),
                `${operation.operationId}: ${slot}`,
            );
        }
    }
    assert(bundle.endpoints["ambiguous#send_email"]);
    assert(bundle.endpoints["ambiguous#delete_contact"]);
    assert(bundle.endpoints["ambiguous#audio_transcribe"]);
    assertEquals(bundle.endpoints["ambiguous#generate_image"], undefined);
});

Deno.test("ambiguous: native create/connect capture keys privately and preserve two-customer isolation", async () => {
    await withHosts(async (a, b, directory) => {
        const created = await a.run("connections/create", {
            body: {
                agent_display_name: "Synthetic agent",
                human_email: "owner@example.test",
            },
        });
        const connected = await b.run("connections/connect", {
            body: { code: CODE },
        });
        assertEquals(created.httpStatus, 201);
        assertEquals(connected.httpStatus, 200);
        assert(
            !JSON.stringify([created, connected, a.resources, b.resources])
                .includes("ak_synthetic"),
        );
        const aId = a.resources[0].externalId;
        const bId = b.resources[0].externalId;
        assertEquals(
            (await a.run("auth_whoami", {
                pathParams: { monid_connection: aId },
            })).output,
            identity(KEY_A),
        );
        assertEquals(
            (await b.run("auth_whoami", {
                pathParams: { monid_connection: bId },
            })).output,
            identity(KEY_B),
        );
        const count = a.calls.length;
        const denied = await a.run("auth_whoami", {
            pathParams: { monid_connection: bId },
        });
        assertEquals(denied.httpStatus, 404);
        assertEquals(a.calls.length, count);
        await assertRejects(
            () => a.credentials.resolve("ambiguous", ORIGIN, bId),
            Error,
            "unavailable",
        );
        for await (const file of Deno.readDir(directory)) {
            assert(
                !(await Deno.readTextFile(`${directory}/${file.name}`))
                    .includes("ak_synthetic"),
            );
        }
        const listed = await a.run("connections/list");
        assertEquals((listed.output as Json[]).length, 1);
        const resource = await a.engine.loadResource(
            await testResourceUnit("ambiguous/connection"),
        );
        assertEquals(await resource.verify(a.resources[0]), { active: true });
    });
});

Deno.test("ambiguous: consumed setup code is redacted, never retried or replaced with signup", async () => {
    await withHosts(async (a) => {
        await a.run("connections/connect", { body: { code: CODE } });
        const failed = await a.run("connections/connect", {
            body: { code: CODE },
        });
        assertEquals(failed.httpStatus, 401);
        assert(!JSON.stringify(failed).includes(KEY_B));
        assertEquals(a.calls.length, 2);
        assertEquals(a.resources.length, 1);
        const unit = await testSealedUnit("ambiguous#connections/connect");
        assertEquals(redactRunInput(unit.doc, { body: { code: CODE } }), {
            body: { code: "[redacted]" },
        });
    });
});

Deno.test("ambiguous: disconnect forgets the credential and resource; revoked credentials stay errors", async () => {
    await withHosts(async (a) => {
        await a.run("connections/connect", { body: { code: CODE } });
        const reference = a.resources[0].externalId;
        a.revoke();
        assertEquals(
            (await a.run("auth_whoami", {
                pathParams: { monid_connection: reference },
            })).httpStatus,
            401,
        );
        await a.run("connections/disconnect", {
            pathParams: { monid_connection: reference },
        });
        const count = a.calls.length;
        assertEquals(
            (await a.run("auth_whoami", {
                pathParams: { monid_connection: reference },
            })).httpStatus,
            404,
        );
        assertEquals(a.calls.length, count);
        await assertRejects(
            () => a.credentials.resolve("ambiguous", ORIGIN, reference),
            Error,
            "unavailable",
        );
    });
});

Deno.test("ambiguous: multipart upload, binary export and declared idempotency headers retain their wire formats", async () => {
    await withHosts(async (a) => {
        await a.run("connections/connect", { body: { code: CODE } });
        const reference = a.resources[0].externalId;
        const result = await a.run("chat_emoji_create", {
            pathParams: { monid_connection: reference },
            body: {
                name: "synthetic",
                image: {
                    filename: "pixel.png",
                    contentType: "image/png",
                    dataBase64: "AP+AQQ==",
                },
            },
        });
        assertEquals(result.httpStatus, 200);
        const upload = a.calls.at(-1)!;
        assert(upload.body instanceof FormData);
        assertEquals(upload.headers.get("content-type"), null);
        const image = upload.body.get("image") as File;
        assertEquals(Array.from(new Uint8Array(await image.arrayBuffer())), [
            0,
            255,
            128,
            65,
        ]);
        const exported = await a.run("export_document", {
            pathParams: { monid_connection: reference, id: ID_A },
            body: { format: "pdf" },
        });
        assertEquals(exported.output, {
            dataBase64: "AP+AQQ==",
            contentType: "application/pdf",
            contentDisposition: "attachment; filename=export.pdf",
        });
        await a.run("rotate_calendar_publish_url", {
            pathParams: { monid_connection: reference, calendar_id: ID_A },
            headers: { "Idempotency-Key": "synthetic-one-call" },
        });
        assertEquals(
            a.calls.at(-1)!.headers.get("Idempotency-Key"),
            "synthetic-one-call",
        );
        const count = a.calls.length;
        await assertRejects(
            () =>
                a.run("auth_whoami", {
                    pathParams: { monid_connection: reference },
                    headers: { Authorization: "Bearer injected" },
                }),
            Error,
            "Header inputs",
        );
        assertEquals(a.calls.length, count);
    });
});

Deno.test("ambiguous: provisioning refuses a missing host vault before any upstream mutation", async () => {
    let calls = 0;
    const engine = new Engine({
        transport: directTransport({
            fetch: () => {
                calls++;
                throw new Error("Unexpected request");
            },
        }),
        resources: { owned: () => Promise.resolve([]) },
    });
    const endpoint = await engine.load(
        await testSealedUnit("ambiguous#connections/create"),
    );
    await assertRejects(
        () =>
            endpoint.run({
                body: {
                    agent_display_name: "Synthetic",
                    human_email: "owner@example.test",
                },
            }),
        Error,
        "scoped credential store",
    );
    assertEquals(calls, 0);
});

Deno.test("ambiguous: generated writes preserve rich content, null clearing, HTTP verbs and pagination", async () => {
    await withHosts(async (a) => {
        await a.run("connections/connect", { body: { code: CODE } });
        const reference = a.resources[0].externalId;
        const content = JSON.stringify({
            type: "doc",
            content: [{
                type: "paragraph",
                content: [{
                    type: "text",
                    text: "Formatted",
                    marks: [{
                        type: "textStyle",
                        attrs: { color: "#123456", fontSize: "18px" },
                    }],
                }],
            }],
        });
        await a.run("create_document", {
            pathParams: { monid_connection: reference },
            body: { type: "doc", title: "Fixture", content },
        });
        assertEquals(a.calls.at(-1)!.body, {
            type: "doc",
            title: "Fixture",
            content,
        });
        await a.run("update_task", {
            pathParams: { monid_connection: reference, id: ID_A },
            body: { assignee_id: null, due_date: null, status: "done" },
        });
        assertEquals(a.calls.at(-1)!.method, "PATCH");
        assertEquals(a.calls.at(-1)!.body, {
            assignee_id: null,
            due_date: null,
            status: "done",
        });
        await a.run("tasks_delete", {
            pathParams: { monid_connection: reference, id: ID_A },
        });
        assertEquals(a.calls.at(-1)!.method, "DELETE");
        await a.run("list_documents", {
            pathParams: { monid_connection: reference },
            queryParams: { limit: 5, cursor: "next-page", offset: null },
        });
        const query = new URL(a.calls.at(-1)!.url).searchParams;
        assertEquals(query.get("limit"), "5");
        assertEquals(query.get("cursor"), "next-page");
        assertEquals(query.has("offset"), false);
    });
});
