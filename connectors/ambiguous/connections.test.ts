import { assert, assertEquals, assertRejects } from "@std/assert";
import { buildRequest, Engine } from "@monid/connector-engine";
import { testSealedUnit } from "@shared/testing";
import {
    AmbiguousConnections,
    ConnectionError,
    type ConnectionStore,
} from "./connections.ts";
import { FileConnectionStore } from "./file-store.ts";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const WORKSPACE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const WORKSPACE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const KEY_A = "ak_synthetic_customer_a";
const KEY_B = "ak_synthetic_customer_b";
const CODE = "ahc_" + "s".repeat(43);

function profile(apiKey: string) {
    const a = apiKey === KEY_A;
    return {
        id: a ? USER_A : USER_B,
        workspace_id: a ? WORKSPACE_A : WORKSPACE_B,
        workspace_name: a ? "Alpha" : "Beta",
        display_name: a ? "Agent A" : "Agent B",
        type: "agent",
    };
}

function memoryStore() {
    const rows = new Map<string, string>();
    const store: ConnectionStore = {
        insert: (key, value) => {
            if (rows.has(key)) {
                return Promise.reject(new Error("Duplicate connection"));
            }
            rows.set(key, value);
            return Promise.resolve();
        },
        read: (key) => Promise.resolve(rows.get(key) ?? null),
        remove: (key) => {
            rows.delete(key);
            return Promise.resolve();
        },
    };
    return { store, rows };
}

async function encryptionKey() {
    return await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
}

function vendor() {
    const calls: {
        url: string;
        method: string;
        authorization: string | null;
        body: unknown;
    }[] = [];
    let revoked = false;
    let codeUsed = false;
    const fetcher: typeof fetch = async (input, init) => {
        const url = String(input);
        const authorization = new Headers(init?.headers).get("Authorization");
        const body = typeof init?.body === "string"
            ? JSON.parse(init.body)
            : undefined;
        calls.push({ url, method: init?.method ?? "GET", authorization, body });
        if (url.endsWith("/api/auth/signup-agent")) {
            assertEquals(authorization, null);
            return Response.json({
                api_key: KEY_A,
                agent: { id: USER_A, display_name: body.agent_display_name },
                workspace: { id: WORKSPACE_A, name: "Alpha" },
                human: { claim_token_sent: true },
            }, { status: 201 });
        }
        if (url.endsWith("/api/auth/key-handoff/exchange")) {
            assertEquals(authorization, null);
            assertEquals(body, { code: CODE });
            if (codeUsed) {
                return Response.json(
                    { error: "Invalid or expired setup code" },
                    { status: 401 },
                );
            }
            codeUsed = true;
            return Response.json({
                token: KEY_B,
                display_name: "Agent B",
                primary_email: null,
            });
        }
        if (revoked) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const key = authorization?.replace("Bearer ", "");
        assert(key === KEY_A || key === KEY_B);
        return Response.json(profile(key));
    };
    return {
        fetcher,
        calls,
        revoke: () => {
            revoked = true;
        },
    };
}

Deno.test("ambiguous connections: create and connect persist encrypted credentials and run as separate customers", async () => {
    const { store, rows } = memoryStore();
    const upstream = vendor();
    const key = await encryptionKey();
    const manager = new AmbiguousConnections(store, key, upstream.fetcher);
    const a = await manager.create("customer-a", {
        agent_display_name: "Agent A",
        human_email: "owner@example.test",
    });
    const b = await manager.connectSetupCode("customer-b", CODE, WORKSPACE_B);
    assertEquals(a.workspaceId, WORKSPACE_A);
    assertEquals(a.claimEmailSent, true);
    assertEquals(b.workspaceId, WORKSPACE_B);
    for (const value of [...rows.values(), JSON.stringify([a, b])]) {
        assert(!value.includes(KEY_A));
        assert(!value.includes(KEY_B));
        assert(!value.includes(CODE));
    }
    const restarted = new AmbiguousConnections(store, key, upstream.fetcher);
    const unit = await testSealedUnit("ambiguous#whoami");
    const run = async (scope: string, id: string) =>
        await (await new Engine({
            transport: restarted.transport(scope, id),
        }).load(unit)).run({});
    const [resultA, resultB] = await Promise.all([
        run("customer-a", a.id),
        run("customer-b", b.id),
    ]);
    assertEquals(resultA.output, profile(KEY_A));
    assertEquals(resultB.output, profile(KEY_B));
    assertEquals(resultA.usage, { credits: {}, evidence: {} });
    const count = upstream.calls.length;
    await assertRejects(
        () => run("customer-a", b.id),
        Error,
        "Connection not found",
    );
    assertEquals(upstream.calls.length, count);
    await assertRejects(
        () => manager.get("customer-a", b.id),
        ConnectionError,
        "Connection not found",
    );
    await assertRejects(
        () => manager.disconnect("customer-a", b.id),
        ConnectionError,
        "Connection not found",
    );
});

Deno.test("ambiguous connections: existing API/OAuth credential is validated against the selected workspace", async () => {
    const { store, rows } = memoryStore();
    const upstream = vendor();
    const manager = new AmbiguousConnections(
        store,
        await encryptionKey(),
        upstream.fetcher,
    );
    await assertRejects(
        () => manager.connectToken("customer-a", KEY_B, WORKSPACE_A),
        ConnectionError,
        "does not match",
    );
    assertEquals(rows.size, 0);
    const connected = await manager.connectToken(
        "customer-a",
        KEY_A,
        WORKSPACE_A,
    );
    assertEquals(connected.userId, USER_A);
    assertEquals(
        upstream.calls.every((call) => call.url.endsWith("/api/users/me")),
        true,
    );
});

Deno.test("ambiguous connections: consumed setup code fails without provisioning a replacement workspace", async () => {
    const { store } = memoryStore();
    const upstream = vendor();
    const manager = new AmbiguousConnections(
        store,
        await encryptionKey(),
        upstream.fetcher,
    );
    await manager.connectSetupCode("customer-a", CODE);
    await assertRejects(
        () => manager.connectSetupCode("customer-b", CODE),
        ConnectionError,
        "HTTP 401",
    );
    assertEquals(
        upstream.calls.filter((call) => call.url.endsWith("/signup-agent"))
            .length,
        0,
    );
});

Deno.test("ambiguous connections: disconnect and upstream revocation stop subsequent calls", async () => {
    const { store } = memoryStore();
    const upstream = vendor();
    const manager = new AmbiguousConnections(
        store,
        await encryptionKey(),
        upstream.fetcher,
    );
    const connected = await manager.connectToken("customer-a", KEY_A);
    const endpoint = await new Engine({
        transport: manager.transport("customer-a", connected.id),
    })
        .load(await testSealedUnit("ambiguous#whoami"));
    upstream.revoke();
    const revoked = await endpoint.run({});
    assertEquals(revoked.httpStatus, 401);
    assertEquals(revoked.usage, { credits: {}, evidence: {} });
    await manager.disconnect("customer-a", connected.id);
    const count = upstream.calls.length;
    await assertRejects(() => endpoint.run({}), Error, "Connection not found");
    assertEquals(upstream.calls.length, count);
});

Deno.test("ambiguous connections: ciphertext is bound to the customer and connection", async () => {
    const { store, rows } = memoryStore();
    const upstream = vendor();
    const key = await encryptionKey();
    const manager = new AmbiguousConnections(store, key, upstream.fetcher);
    const a = await manager.connectToken("customer-a", KEY_A);
    const b = await manager.connectToken("customer-b", KEY_B);
    const entries = [...rows.entries()];
    rows.set(entries[1][0], entries[0][1]);
    await assertRejects(
        () => manager.get("customer-b", b.id),
        ConnectionError,
        "could not be decrypted",
    );
    const wrongKey = new AmbiguousConnections(
        store,
        await encryptionKey(),
        upstream.fetcher,
    );
    await assertRejects(
        () => wrongKey.get("customer-a", a.id),
        ConnectionError,
        "could not be decrypted",
    );
});

Deno.test("ambiguous connections: onboarding never follows redirects, retries, or echoes secret errors", async () => {
    const { store, rows } = memoryStore();
    let count = 0;
    const fetcher: typeof fetch = (_url, init) => {
        count++;
        assertEquals(init?.redirect, "error");
        return Promise.resolve(
            Response.json({ error: KEY_A }, { status: 500 }),
        );
    };
    const manager = new AmbiguousConnections(
        store,
        await encryptionKey(),
        fetcher,
    );
    const error = await assertRejects(
        () => manager.connectToken("customer-a", KEY_A),
        ConnectionError,
    );
    assert(!String(error).includes(KEY_A));
    assertEquals(count, 1);
    assertEquals(rows.size, 0);
});

Deno.test("ambiguous connections: a bound transport refuses other providers and origins before credential lookup", async () => {
    const { store } = memoryStore();
    const upstream = vendor();
    const manager = new AmbiguousConnections(
        store,
        await encryptionKey(),
        upstream.fetcher,
    );
    const a = await manager.connectToken("customer-a", KEY_A);
    const unit = await testSealedUnit("ambiguous#whoami");
    const transport = manager.transport("customer-a", a.id);
    const request = buildRequest(
        unit.doc,
        {},
        unit.fns[unit.doc.auth.inject.$fn.key],
    );
    const count = upstream.calls.length;
    for (
        const invalid of [
            { ...request, url: "https://example.test/api/users/me" },
            {
                ...request,
                url: "https://app.ambiguous.ai.evil.test/api/users/me",
            },
            { ...request, url: "http://app.ambiguous.ai/api/users/me" },
            { ...request, url: "https://name@app.ambiguous.ai/api/users/me" },
            { ...request, provider: "other-provider" },
            { ...request, auth: undefined },
        ]
    ) {
        await assertRejects(
            () => transport.execute(invalid),
            ConnectionError,
            "outside",
        );
    }
    assertEquals(upstream.calls.length, count);
    assertEquals(unit.doc.request.url, "https://app.ambiguous.ai/api/users/me");
});

Deno.test("ambiguous connections: file persistence survives re-opening without plaintext credentials", async () => {
    const directory = await Deno.makeTempDir();
    try {
        const key = await encryptionKey();
        const upstream = vendor();
        const manager = new AmbiguousConnections(
            new FileConnectionStore(directory),
            key,
            upstream.fetcher,
        );
        const connection = await manager.connectToken("customer-a", KEY_A);
        const reopened = new AmbiguousConnections(
            new FileConnectionStore(directory),
            key,
            upstream.fetcher,
        );
        assertEquals(
            await reopened.get("customer-a", connection.id),
            connection,
        );
        for await (const entry of Deno.readDir(directory)) {
            assert(
                !(await Deno.readTextFile(`${directory}/${entry.name}`))
                    .includes(KEY_A),
            );
        }
        await reopened.disconnect("customer-a", connection.id);
        await assertRejects(
            () => manager.get("customer-a", connection.id),
            ConnectionError,
            "not found",
        );
    } finally {
        await Deno.remove(directory, { recursive: true });
    }
});
