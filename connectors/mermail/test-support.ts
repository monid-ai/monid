import { assertEquals, assertRejects } from "@std/assert";
import type { Json, RunInput, SealedUnit } from "@shared/core";
import {
    directTransport,
    Engine,
    type RunCompleted,
} from "@monid/connector-engine";
import { type Fixture, replayFetch, testSealedUnit } from "@shared/testing";

export interface CapturedRequest {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: Json;
}

const FIXTURE_API_KEY = "sk-proj-fixture";

export async function mermailHarness(
    unit: SealedUnit,
    fixture?: Fixture,
    apiKey = FIXTURE_API_KEY,
): Promise<{
    run(input: RunInput): Promise<RunCompleted>;
    calls: CapturedRequest[];
}> {
    const calls: CapturedRequest[] = [];
    const upstream = fixture
        ? replayFetch(fixture, {
            "request.url": unit.doc.request.url,
            "request.origin": new URL(unit.doc.request.url).origin,
        })
        : fetch;
    const capturedFetch: typeof fetch = (input, init) => {
        const url = typeof input === "string"
            ? input
            : input instanceof URL
            ? input.href
            : input.url;
        const body = typeof init?.body === "string"
            ? JSON.parse(init.body) as Json
            : undefined;
        calls.push({
            url,
            method: init?.method ?? "GET",
            headers: Object.fromEntries(new Headers(init?.headers)),
            ...(body !== undefined ? { body } : {}),
        });
        return upstream(input, init);
    };
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey }),
            fetch: capturedFetch,
        }),
        ...(fixture ? { sleep: () => Promise.resolve() } : {}),
    });
    const loaded = await engine.load(unit);
    return {
        run: (input) => loaded.run(input),
        calls,
    };
}

export function oneCallFixture(
    name: string,
    description: string,
    body: Json,
    status = 200,
): Fixture {
    return {
        name,
        description,
        calls: [{
            req: {
                method: "POST",
                url: "{{request.url}}",
            },
            res: { status, body },
        }],
    };
}

export function assertPinnedMcpCall(
    call: CapturedRequest,
    tool: string,
    rpcId: string,
    args: Json,
): void {
    assertEquals(call.method, "POST");
    assertEquals(call.url, "https://console.mermail.app/mcp");
    assertEquals(call.headers["x-api-key"], FIXTURE_API_KEY);
    assertEquals(call.headers.authorization, undefined);
    assertEquals(call.headers["content-type"], "application/json");
    assertEquals(call.headers.accept, "application/json,text/event-stream");
    assertEquals(call.headers["mcp-protocol-version"], "2026-07-28");
    assertEquals(call.headers["mcp-method"], "tools/call");
    assertEquals(call.headers["mcp-name"], tool);
    assertEquals(call.body, {
        jsonrpc: "2.0",
        id: rpcId,
        method: "tools/call",
        params: {
            name: tool,
            arguments: args,
            _meta: {
                "io.modelcontextprotocol/protocolVersion": "2026-07-28",
                "io.modelcontextprotocol/clientCapabilities": {},
                "io.modelcontextprotocol/clientInfo": {
                    name: "monid",
                    version: "1.0.0",
                },
            },
        },
    });
}

export async function assertHappyCall(opts: {
    id: string;
    tool: string;
    rpcId: string;
    input: RunInput;
    args: Json;
    output: Json;
    credits: number;
}): Promise<void> {
    const unit = await testSealedUnit(opts.id);
    const fixture = oneCallFixture(
        `${opts.tool}-happy`,
        `Synthetic MCP tools/call success for ${opts.tool}.`,
        mcpSuccess(opts.rpcId, opts.output),
    );
    const harness = await mermailHarness(unit, fixture);
    const result = await harness.run(opts.input);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.providerHttpStatus, undefined);
    assertEquals(result.usage, {
        credits: { default: opts.credits },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, opts.output);
    assertEquals(harness.calls.length, 1);
    assertPinnedMcpCall(
        harness.calls[0],
        opts.tool,
        opts.rpcId,
        opts.args,
    );
}

export async function assertRejectedBeforeCall(
    id: string,
    body: Json,
): Promise<void> {
    const unit = await testSealedUnit(id);
    const fixture = oneCallFixture(
        `${id}-unused`,
        "Unused success fixture. Schema rejection must not reach it.",
        mcpSuccess("unused", {}),
    );
    const harness = await mermailHarness(unit, fixture);
    await assertRejects(
        () => harness.run({ body }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(harness.calls, []);
}

export function mcpSuccess(
    id: string,
    structuredContent: Json,
): Json {
    return {
        jsonrpc: "2.0",
        id,
        result: {
            content: [{
                type: "text",
                text: JSON.stringify(structuredContent),
            }],
            structuredContent,
            resultType: "complete",
        },
    };
}
