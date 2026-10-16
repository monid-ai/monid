import { assert, assertEquals, assertRejects } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import type { Json } from "@shared/core";

const anonymousHeaders = (init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    assertEquals(
        headers.get("user-agent"),
        "monid/parallel-search-mcp (https://github.com/monid-ai/monid)",
    );
    assertEquals(headers.get("accept"), "application/json, text/event-stream");
    assertEquals(headers.get("authorization"), null);
    assertEquals(headers.get("x-api-key"), null);
    return headers;
};

async function execute(
    options: {
        stage?: string;
        status?: number;
        reply?: Json;
        sse?: boolean;
        cleanupThrows?: boolean;
        session?: boolean;
    } = {},
) {
    const methods: string[] = [];
    const endpoint = await new Engine({
        transport: directTransport({
            params: (_provider, fields) => {
                assertEquals(fields, ["apiKey"]);
                return Promise.resolve({ apiKey: "saved-key-must-not-egress" });
            },
            fetch: (url, init) => {
                assertEquals(String(url), "https://search.parallel.ai/mcp");
                const headers = anonymousHeaders(init);
                const request = init?.body ? JSON.parse(String(init.body)) : {};
                const method = init?.method === "DELETE"
                    ? "DELETE"
                    : request.method;
                methods.push(method);
                if (method !== "initialize") {
                    assertEquals(
                        headers.get("mcp-protocol-version"),
                        "2025-03-26",
                    );
                    assertEquals(
                        headers.get("mcp-session-id"),
                        options.session === false ? null : "test-session",
                    );
                }
                if (method === "DELETE") {
                    if (options.cleanupThrows) {
                        return Promise.reject(new Error("cleanup failed"));
                    }
                    return Promise.resolve(new Response(null, { status: 405 }));
                }
                if (method === options.stage) {
                    return Promise.resolve(
                        new Response(
                            JSON.stringify(
                                options.reply ?? { message: "limited" },
                            ),
                            {
                                status: options.status ?? 200,
                                headers: method === "initialize"
                                    ? { "mcp-session-id": "test-session" }
                                    : {},
                            },
                        ),
                    );
                }
                if (method === "notifications/initialized") {
                    assertEquals(request.id, undefined);
                    return Promise.resolve(new Response(null, { status: 202 }));
                }
                const result = method === "initialize"
                    ? {
                        protocolVersion: "2025-03-26",
                        capabilities: { tools: {} },
                        serverInfo: { name: "fixture", version: "1" },
                    }
                    : {
                        structuredContent: {
                            results: [{
                                url: "https://deno.com/blog/v2.0",
                                excerpts: [
                                    "Deno 2 is backward compatible with Node.js.",
                                ],
                            }],
                        },
                    };
                if (method === "tools/call") {
                    assertEquals(request.params.name, "web_search");
                    assertEquals(request.params.arguments, {
                        objective: "Deno 2",
                        search_queries: ["Deno 2 release"],
                    });
                }
                const reply = { jsonrpc: "2.0", id: request.id, result };
                // A comment, a progress notification and a multiline response.
                const wire = options.sse
                    ? ': keepalive\r\n\r\ndata: {"jsonrpc":"2.0","method":"notifications/progress"}\r\n\r\nevent: message\r\ndata: ' +
                        JSON.stringify(reply).slice(0, -1) +
                        "\r\ndata: }\r\n\r\n"
                    : JSON.stringify(reply);
                return Promise.resolve(
                    new Response(wire, {
                        status: 200,
                        headers:
                            method === "initialize" && options.session !== false
                                ? { "mcp-session-id": "test-session" }
                                : {},
                    }),
                );
            },
        }),
    }).load(await testSealedUnit("parallel#search"));
    const result = await endpoint.run({
        body: { objective: "Deno 2", search_queries: ["Deno 2 release"] },
    });
    return { result, methods };
}

Deno.test("parallel: catalog identities, empty credentials and FREE estimates", async () => {
    const bundle = await testBundle();
    for (const tool of ["search", "fetch"]) {
        const unit = await testSealedUnit(`parallel#${tool}`);
        assertEquals(unit.doc.request.url, "https://search.parallel.ai/mcp");
        assertEquals(unit.doc.usage.model.kind, "FREE");
        assertEquals(unit.doc.auth.credentials.properties, {});
        assertEquals(
            await estimateEndpoint(unit, {
                body: tool === "search"
                    ? { objective: "Deno", search_queries: ["Deno"] }
                    : { urls: ["https://deno.com"] },
            }),
            { credits: {}, evidence: {} },
        );
        const lock = JSON.parse(
            await Deno.readTextFile(
                new URL("../ids.lock.json", import.meta.url),
            ),
        );
        assert(lock.endpoints.includes(`parallel#${tool}`));
    }
    assertEquals(
        bundle.endpoints["parallel#search"].lifecycle?.start,
        bundle.endpoints["parallel#fetch"].lifecycle?.start,
    );
    // Existing reference provider still selects its native keyed route.
    assertEquals(
        bundle.endpoints["exa#search"].request.url,
        "https://api.exa.ai/search",
    );
});

for (const sse of [false, true]) {
    Deno.test(`parallel: compiled caller ${sse ? "SSE" : "JSON"} replies and best-effort cleanup`, async () => {
        const { result, methods } = await execute({ sse, cleanupThrows: true });
        assertEquals(methods, [
            "initialize",
            "notifications/initialized",
            "tools/call",
            "DELETE",
        ]);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(
            Array.isArray((result.output as { results: unknown[] }).results),
        );
    });
}

Deno.test("parallel: stateless server omits transport session", async () => {
    const { result, methods } = await execute({ session: false });
    assertEquals(methods, [
        "initialize",
        "notifications/initialized",
        "tools/call",
    ]);
    assertEquals(result.isProviderError, false);
});

for (const stage of ["initialize", "notifications/initialized", "tools/call"]) {
    Deno.test(`parallel: ${stage} 429 is provider error, no retry, zero usage`, async () => {
        const { result, methods } = await execute({ stage, status: 429 });
        assertEquals(result.httpStatus, 429);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(methods.filter((m) => m === stage).length, 1);
        if (stage !== "tools/call") {
            assertEquals(methods.includes("tools/call"), false);
        }
    });
}

for (
    const reply of [
        {
            jsonrpc: "2.0",
            id: 2,
            error: { code: -32602, message: "Invalid input" },
        },
        {
            jsonrpc: "2.0",
            id: 2,
            result: {
                isError: true,
                content: [{ type: "text", text: "Failed" }],
            },
        },
        { jsonrpc: "2.0", id: 99, result: {} },
        { jsonrpc: "2.0", id: 2, result: {} },
        "not valid SSE",
    ] as Json[]
) {
    Deno.test(`parallel: invalid tool reply ${JSON.stringify(reply)} fails as data`, async () => {
        const { result, methods } = await execute({
            stage: "tools/call",
            reply,
        });
        assertEquals(result.httpStatus, 502);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(methods.at(-1), "DELETE");
    });
}

Deno.test("parallel: unsupported negotiated version prevents tool dispatch", async () => {
    const { result, methods } = await execute({
        stage: "initialize",
        reply: {
            jsonrpc: "2.0",
            id: 1,
            result: { protocolVersion: "2099-01-01" },
        },
    });
    assertEquals(result.httpStatus, 502);
    assertEquals(methods, ["initialize", "DELETE"]);
});

for (
    const [tool, bodies] of [
        ["search", [{ objective: "test", search_queries: [] }, {
            search_queries: ["test"],
        }, { objective: "test", search_queries: ["test"], api_key: "secret" }]],
        ["fetch", [{ urls: [] }, { urls: ["file:///etc/passwd"] }, {
            urls: Array(21).fill("https://deno.com"),
        }, { urls: ["https://deno.com"], objective: "x".repeat(201) }]],
    ] as [string, Json[]][]
) {
    Deno.test(`parallel#${tool}: input limits reject before egress`, async () => {
        const unit = await testSealedUnit(`parallel#${tool}`);
        for (const body of bodies) {
            await assertRejects(
                () => runEndpoint({ unit, input: { body }, mode: "replay" }),
                Error,
                "INVALID_INPUT",
            );
        }
    });
}

for (const tool of ["search", "fetch"]) {
    Deno.test(`parallel#${tool}: recorded anonymous protocol chain returns useful output`, async () => {
        const fixture = await loadFixture(
            new URL(`./fixtures/${tool}.json`, import.meta.url).pathname,
        );
        const body =
            (fixture.calls[2].req.body as { params: { arguments: Json } })
                .params.arguments;
        const result = await runEndpoint({
            unit: await testSealedUnit(`parallel#${tool}`),
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as {
            results: { url: string; excerpts: string[] }[];
        };
        assert(output.results.length > 0);
        assert(output.results[0].excerpts[0].length > 30);
        assertEquals(
            result.output,
            (fixture.calls[2].res.body as {
                result: { structuredContent: Json };
            }).result.structuredContent,
        );
    });
}
