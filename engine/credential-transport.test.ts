import { assert, assertEquals, assertRejects } from "@std/assert";
import { buildRequest, directTransport, Engine, EngineError } from "./mod.ts";
import type { CredentialStore } from "./interfaces/mod.ts";
import { testSealedUnit } from "@shared/testing";
import { FileCredentialStore } from "../scripts/store/credentials.ts";

async function captureRequest() {
    const unit = await testSealedUnit("ambiguous#connections/create");
    return buildRequest(unit.doc, {
        body: {
            agent_display_name: "Fixture",
            human_email: "owner@example.test",
        },
    }, unit.fns[unit.doc.auth.inject.$fn.key]);
}

Deno.test("credential transport: an older Relay is rejected before loading a credential-bearing connector", async () => {
    let calls = 0;
    const engine = new Engine({
        transport: {
            execute: () => {
                calls++;
                throw new Error("must not dispatch");
            },
        },
        resources: { owned: () => Promise.resolve([]) },
    });
    const error = await assertRejects(
        async () =>
            engine.load(await testSealedUnit("ambiguous#connections/create")),
        EngineError,
    );
    assertEquals(error.code, "UNSUPPORTED_TRANSPORT");
    assertEquals(calls, 0);
});

Deno.test("credential transport: raw keys and duplicate occurrences never leave the transport", async () => {
    const captured: Record<string, string>[] = [];
    const credentials: CredentialStore = {
        capture: (_provider, _origin, params) => {
            captured.push(params);
            return Promise.resolve("opaque-reference");
        },
        resolve: () => Promise.reject(new Error("unexpected resolution")),
        forget: () => Promise.resolve(),
    };
    const request = await captureRequest();
    const transport = directTransport({
        credentials,
        fetch: () =>
            Promise.resolve(Response.json({
                api_key: "secret-fixture",
                nested: {
                    api_key: "secret-fixture",
                    value: "prefix secret-fixture suffix",
                },
                workspace: { id: "public-id" },
            }, { headers: { "x-debug-key": "secret-fixture" } })),
    });
    const response = await transport.execute(request);
    assertEquals(captured, [{ apiKey: "secret-fixture" }]);
    assert(!JSON.stringify(response).includes("secret-fixture"));
    assertEquals(
        JSON.parse(response.body).nested.value,
        "prefix [redacted] suffix",
    );
    assertEquals(JSON.parse(response.body).credentialRef, "opaque-reference");
    assertEquals(response.headers, {});
});

Deno.test("credential transport: malformed, ambiguous or unpersistable exchange is non-retriable and secret-free", async () => {
    const request = await captureRequest();
    for (
        const payload of [{ api_key: "" }, {
            api_key: "secret-fixture",
            credentialRef: "attacker",
        }, { api_key: "secret-fixture" }]
    ) {
        const credentials: CredentialStore = {
            capture: () => Promise.reject(new Error("secret-fixture")),
            resolve: () => Promise.resolve({}),
            forget: () => Promise.resolve(),
        };
        let calls = 0;
        const transport = directTransport({
            credentials,
            fetch: () => {
                calls++;
                return Promise.resolve(Response.json(payload));
            },
        });
        const error = await assertRejects(
            () => transport.execute(request),
            EngineError,
        );
        assertEquals(error.code, "CREDENTIAL_CAPTURE_FAILED");
        assertEquals(error.retriable, false);
        assert(!String(error).includes("secret-fixture"));
        assertEquals(calls, 1);
    }
});

Deno.test("credential transport: a requested reference never falls back to provider environment credentials", async () => {
    const request = await captureRequest();
    request.auth!.capture = undefined;
    request.credentialRef = "missing";
    let paramsCalled = false;
    const transport = directTransport({
        params: () => {
            paramsCalled = true;
            return Promise.resolve({ apiKey: "global-key" });
        },
    });
    await assertRejects(
        () => transport.execute(request),
        EngineError,
        "scoped credential store",
    );
    assertEquals(paramsCalled, false);
});

Deno.test("credential store: encrypted persistence binds customer, provider, origin and reference", async () => {
    const directory = await Deno.makeTempDir();
    try {
        const key = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"],
        );
        const store = new FileCredentialStore(directory, key, "customer-a");
        const reference = await store.capture(
            "provider",
            "https://vendor.test",
            { apiKey: "persisted-fixture-key" },
        );
        const restart = new FileCredentialStore(directory, key, "customer-a");
        assertEquals(
            await restart.resolve("provider", "https://vendor.test", reference),
            { apiKey: "persisted-fixture-key" },
        );
        await assertRejects(
            () => restart.resolve("other", "https://vendor.test", reference),
            EngineError,
        );
        await assertRejects(
            () => restart.resolve("provider", "https://other.test", reference),
            EngineError,
        );
        await assertRejects(
            () =>
                new FileCredentialStore(directory, key, "customer-b").resolve(
                    "provider",
                    "https://vendor.test",
                    reference,
                ),
            EngineError,
        );
        for await (const entry of Deno.readDir(directory)) {
            const file = `${directory}/${entry.name}`;
            assert(
                !(await Deno.readTextFile(file)).includes(
                    "persisted-fixture-key",
                ),
            );
            if (Deno.build.os !== "windows") {
                assertEquals((await Deno.stat(file)).mode! & 0o777, 0o600);
            }
            const ciphertext = JSON.parse(await Deno.readTextFile(file));
            ciphertext.ciphertext[0] ^= 1;
            await Deno.writeTextFile(file, JSON.stringify(ciphertext));
        }
        await assertRejects(
            () => restart.resolve("provider", "https://vendor.test", reference),
            EngineError,
        );
        await store.forget("provider", "https://vendor.test", reference);
        await store.forget("provider", "https://vendor.test", reference);
        await assertRejects(
            () => store.resolve("provider", "https://vendor.test", reference),
            EngineError,
        );
    } finally {
        await Deno.remove(directory, { recursive: true });
    }
});

Deno.test("HTTP transport: SSE is preserved and multipart uses an actual boundary", async () => {
    const request = await captureRequest();
    request.auth!.capture = undefined;
    request.bodyEncoding = "multipart";
    request.fileFields = ["file"];
    request.body = {
        file: { filename: "file.bin", dataBase64: "AP+AQQ==" },
        label: "fixture",
    };
    request.headers["content-type"] = "multipart/form-data";
    request.responseEncoding = "auto";
    const stream =
        'event: delta\ndata: {"text":"hello"}\n\nevent: done\ndata: {}\n\n';
    const transport = directTransport({
        params: () => Promise.resolve({}),
        fetch: (_url, init) => {
            assert(init?.body instanceof FormData);
            const wire = new Request("https://vendor.test", init);
            assert(wire.headers.get("content-type")?.includes("boundary="));
            return Promise.resolve(
                new Response(stream, {
                    headers: { "content-type": "text/event-stream" },
                }),
            );
        },
    });
    assertEquals((await transport.execute(request)).body, stream);
});
