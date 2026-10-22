import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const IDS = [
    "clawifi#fetch",
    "clawifi#map",
    "clawifi#scrape",
    "clawifi#search/free",
];

Deno.test("clawifi: four endpoints, one auth fn, one consolidate fn, the credits header on every doc", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("clawifi#")
    ).sort();
    assertEquals(ids, IDS);

    const first = bundle.endpoints[IDS[0]];
    for (const id of IDS) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.request.method, "POST", id);
        assertEquals(
            doc.request.url,
            `https://api.clawifi.dev/${id.slice("clawifi#".length)}`,
            id,
        );
        // the opt-in body meter: without it Clawifi never writes
        // `credits_charged` and consolidate has nothing to claim
        assertEquals(
            doc.request.headers?.["X-Clawifi-Include-Credits"],
            "1",
            id,
        );
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assert(doc.usage.consolidate !== undefined, id);
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            first.usage.consolidate?.$fn.key,
            id,
        );
        assertEquals(Object.keys(doc.usage.credits), ["default"], id);
    }

    // fetch and scrape strip the same two unexposed fields with a
    // byte-identical fn: one fnTable entry
    assertEquals(
        bundle.endpoints["clawifi#fetch"].input.toRequest?.$fn.key,
        bundle.endpoints["clawifi#scrape"].input.toRequest?.$fn.key,
    );
    assertEquals(
        bundle.endpoints["clawifi#search/free"].input.toRequest,
        undefined,
    );
    assertEquals(bundle.endpoints["clawifi#map"].input.toRequest, undefined);

    // only search is flat; the others meter so a zero-cost answer derives 0
    const kinds: Record<string, string> = {
        "clawifi#fetch": "COMPOSITE",
        "clawifi#map": "PER_UNIT",
        "clawifi#scrape": "COMPOSITE",
        "clawifi#search/free": "PER_CALL",
    };
    for (const id of IDS) {
        assertEquals(bundle.endpoints[id].usage.model.kind, kinds[id], id);
    }
});

Deno.test("clawifi: the wire request carries bearer auth and the credits header; unexposed fields never leave", async () => {
    const seen: { url: string; headers: Headers; body: unknown }[] = [];
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (input, init) => {
                seen.push({
                    url: String(input),
                    headers: new Headers(init?.headers),
                    body: JSON.parse(String(init?.body)),
                });
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            success: true,
                            cache_hit: false,
                            mode_used: "http_fetch",
                            data: {},
                            credits_charged: 1,
                        }),
                        {
                            status: 200,
                            headers: { "content-type": "application/json" },
                        },
                    ),
                );
            },
        }),
    }).load(await testSealedUnit("clawifi#fetch"));
    const result = await loaded.run({
        body: {
            url: "https://example.com",
            query: "what is this domain for",
            requires_auth: true,
            proxy_config: "http://user:pass@proxy.example:8080",
        },
    });

    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { page: 1 },
    });
    assertEquals(seen.length, 1);
    assertEquals(seen[0].url, "https://api.clawifi.dev/fetch");
    assertEquals(seen[0].headers.get("x-clawifi-include-credits"), "1");
    assertEquals(seen[0].headers.get("authorization"), "Bearer test-key");
    assertEquals(seen[0].body, {
        url: "https://example.com",
        query: "what is this domain for",
    });
});

Deno.test("clawifi: a recorded 401 is data on every endpoint, zero usage, error projected", async () => {
    const fixture = await loadFixture(`${fixturesDir}unauthorized.json`);
    const inputs: Record<string, Record<string, unknown>> = {
        "clawifi#fetch": { url: "https://example.com" },
        "clawifi#map": { url: "https://example.com" },
        "clawifi#scrape": { url: "https://example.com" },
        "clawifi#search/free": { query: "anything" },
    };
    for (const id of IDS) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: { body: inputs[id] as Record<string, string> },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 401, id);
        assertEquals(result.isProviderError, true, id);
        // non-2xx settles at zero; the body's own `credits_charged: 0`
        // agrees, but consolidate never runs on an error envelope
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
        const output = result.output as Record<string, unknown>;
        assertEquals(output.message, "Invalid API key", id);
        assertEquals(output.code, "http_error", id);
        assertEquals(output.retryable, false, id);
    }
});
