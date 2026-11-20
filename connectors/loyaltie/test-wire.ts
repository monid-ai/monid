import type { Json, RunInput } from "@shared/core";
import {
    type Fixture,
    fixtureReader,
    replayFetch,
    type runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

/**
 * Replay a fixture offline AND capture the body the compiled endpoint put
 * on the wire. `replayFetch` matches only method + URL, so a test that reads
 * `fixture.calls[n].req` would pass even if `input.toRequest` sent the wrong
 * tool name or dropped the attribution; asserting `sent` cannot.
 *
 * Loyaltie's server is keyless (empty credential shape), so the transport
 * resolves no params.
 */
export async function replayCapturing(
    id: string,
    input: RunInput,
    fixture: Fixture,
): Promise<{
    result: Awaited<ReturnType<typeof runEndpoint>>;
    sent: Json[];
}> {
    const sent: Json[] = [];
    const replay = replayFetch(fixture);
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({}),
            fetch: (url, init) => {
                sent.push(
                    typeof init?.body === "string"
                        ? JSON.parse(init.body) as Json
                        : null,
                );
                return replay(url, init);
            },
        }),
        sleep: () => Promise.resolve(),
        resources: fixtureReader([]),
        scopeKey: "test-scope",
    });
    const loaded = await engine.load(await testSealedUnit(id));
    return { result: await loaded.run(input), sent };
}

/** The tools/call envelope every Loyaltie endpoint must send, attributed to
 *  Monid (`src: "api"`, `agent_id: "monid"`). Written out, not derived. */
export function expectedEnvelope(
    tool: string,
    args: Record<string, Json>,
): Json {
    return {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: tool,
            arguments: { ...args, src: "api", agent_id: "monid" },
        },
    };
}

/** The tool result the server recorded: what the endpoint must return. */
export function recordedStructuredContent(fixture: Fixture): Json {
    const body = fixture.calls[0].res.body as Record<string, Json>;
    const result = body.result as Record<string, Json>;
    return result.structuredContent;
}
