/**
 * Test-only helpers shared by `provider.test.ts` and the nine
 * `endpoints/<e>/endpoint.test.ts` files. Nothing here is compiled into a
 * doc: the compiler reads `provider.ts` and `endpoints/<e>/endpoint.ts`.
 */
import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunCompleted, RunInput } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { type Fixture, loadFixture, replayFetch } from "@shared/testing";

export const MCP_URL = "https://mcp.dimhour.com/mcp";

export const ONE_CALL = { credits: { default: 1 }, evidence: { CALL: 1 } };
export const ZERO = { credits: {}, evidence: {} };

/** Every test input asks for at most this many results (bulk safety). */
export const MAX_TEST_LIMIT = 2;

const PROVIDER_FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));

/** A provider-level chain: the shared error and lifecycle fixtures. */
export const providerFixture = (name: string): Promise<Fixture> =>
    loadFixture(`${PROVIDER_FIXTURES}${name}.json`);

/** The recorded MCP envelope's structuredContent — what the caller gets. */
export const structuredOf = (f: Fixture): Json =>
    (f.calls[0].res.body as { result: { structuredContent: Json } }).result
        .structuredContent;

/** Fails when a test input asks for more than MAX_TEST_LIMIT results. */
export function assertSmall(input: RunInput): RunInput {
    const limit = (input.body as { limit?: number } | undefined)?.limit;
    assert(
        limit === undefined || limit <= MAX_TEST_LIMIT,
        `a test asks for ${limit} results`,
    );
    return input;
}

/** Run one endpoint through the real engine with a fetch that records
 *  what went on the wire, then replays the chain. */
export async function captureRun(
    unit: Parameters<Engine["load"]>[0],
    input: RunInput,
    chain: Fixture,
    params: Record<string, string> = {},
) {
    const sent: {
        url: string;
        method: string;
        headers: Headers;
        body: Json;
    }[] = [];
    const replay = replayFetch(chain, { "request.url": MCP_URL });
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve(params),
            fetch: (url, init) => {
                sent.push({
                    url: String(url),
                    method: init?.method ?? "GET",
                    headers: new Headers(init?.headers),
                    body: JSON.parse(String(init?.body)),
                });
                return replay(url, init);
            },
        }),
    }).load(unit);
    const result = await loaded.run(input);
    return { sent, result };
}

/** An engine that fails the test on any IO: for the pure estimate. */
export const noIoEngine = () =>
    new Engine({
        transport: directTransport({
            params: () => Promise.resolve({}),
            fetch: () => Promise.reject(new Error("estimate must not do IO")),
        }),
    });

/** The wire request every endpoint sends: POST /mcp, JSON-RPC tools/call
 *  under the fixed tool name, the validated input as params.arguments. */
export function assertToolsCall(
    sent: { url: string; method: string; headers: Headers; body: Json }[],
    tool: string,
    args: Json,
): void {
    assertEquals(sent.length, 1);
    assertEquals(sent[0].url, MCP_URL);
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].body, {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: tool, arguments: args },
    });
    assertEquals(sent[0].headers.get("content-type"), "application/json");
    assertEquals(
        sent[0].headers.get("accept"),
        "application/json, text/event-stream",
    );
}

/** The `rpc-error` chain (-32601 in a 200) settled as a zero-usage 502. */
export function assertRpcError(result: RunCompleted): void {
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, ZERO);
    const out = result.output as Record<string, unknown>;
    assertEquals(out.message, "Method not found");
    assertEquals(out.error_code, -32601);
    assert(out.raw !== undefined, "raw body rides along");
}

/** The `tool-error` chain (result.isError in a 200) settled as a
 *  zero-usage 502 carrying the server's message. */
export function assertToolError(result: RunCompleted): void {
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, ZERO);
    const out = result.output as Record<string, unknown>;
    assert(
        String(out.message).startsWith('Unknown city "atlantis"'),
        String(out.message),
    );
}

/** The live-smoke gate: reads need no credential, so liveSkip (which
 *  skips without one) would never run this; an explicit flag gates it. */
export const liveOff = (): boolean => Deno.env.get("DIMHOUR_LIVE") !== "1";
