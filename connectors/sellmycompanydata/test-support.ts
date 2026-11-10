import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { type Fixture, loadFixture } from "@shared/testing";

export const MCP_URL = "https://sellmycompanydata.com/mcp";
export const FREE = { credits: {}, evidence: {} };
export const META = {
    "io.modelcontextprotocol/clientInfo": { name: "monid", version: "1.0.0" },
};
/** Every header that leaves the process. */
export const WIRE_HEADERS = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2025-11-25",
};

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));

/** A provider-level chain recorded from the public server. */
export function fixture(name: string): Promise<Fixture> {
    return loadFixture(`${FIXTURES}${name}.json`);
}

/** A one-call chain for envelopes no honest request records. */
export function oneCall(name: string, status: number, body: Json): Fixture {
    return {
        name: `synthetic-${name}`,
        description: `Synthetic ${name} envelope, shaped after the ` +
            "server's JSON-RPC handler.",
        calls: [{
            req: { method: "POST", url: "{{request.url}}" },
            res: { status, body },
        }],
    };
}

/** The structuredContent of a recorded success. */
export function structuredOf(fx: Fixture): Record<string, Json> {
    return (fx.calls[0].res.body as {
        result: { structuredContent: Record<string, Json> };
    }).result.structuredContent;
}

export interface Seen {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: Json;
}

/**
 * Engine wired to a capturing fetch: what actually leaves the process.
 * recordingFetch never keeps request headers, and the egress tests pin
 * them.
 */
export function captureEngine(seen: Seen[], respond: () => Response): Engine {
    return new Engine({
        transport: directTransport({
            // keyless: the provider takes no credential, so none is handed over
            params: () => Promise.resolve({}),
            fetch: (input, init) => {
                seen.push({
                    url: String(input),
                    method: init?.method ?? "GET",
                    headers: Object.fromEntries(new Headers(init?.headers)),
                    ...(typeof init?.body === "string"
                        ? { body: JSON.parse(init.body) as Json }
                        : {}),
                });
                return Promise.resolve(respond());
            },
        }),
    });
}

export function jsonResponse(status: number, body: Json): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}
