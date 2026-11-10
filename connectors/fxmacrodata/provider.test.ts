import { assertEquals } from "@std/assert";
import type { RunInput } from "@shared/core";
import { testBundle, testSealedUnit } from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

const IDS = [
    "fxmacrodata#v1/announcements/{currency}/latest",
    "fxmacrodata#v1/announcements/{currency}/{indicator}",
    "fxmacrodata#v1/calendar/{currency}",
    "fxmacrodata#v1/data_catalogue/{currency}",
    "fxmacrodata#v1/forex/{base}/{quote}",
];

Deno.test("fxmacrodata: five GETs, all FREE, one optional-key auth fn, no consolidate", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("fxmacrodata#")
    ).sort();
    assertEquals(ids, IDS);

    const authKeys = new Set<string>();
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.request.method, "GET", id);
        assertEquals(
            doc.request.url.startsWith("https://api.fxmacrodata.com/v1/"),
            true,
            id,
        );
        assertEquals(doc.usage.model, { kind: "FREE" }, id);
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
        authKeys.add(doc.auth.inject.$fn.key);
        // apiKey is declared but not required: the keyless surface runs bare
        assertEquals(Object.keys(doc.auth.credentials.properties ?? {}), [
            "apiKey",
        ]);
        assertEquals(doc.auth.credentials.required ?? [], [], id);
    }
    assertEquals(authKeys.size, 1);
});

/** One run against a stub fetch, recording the headers that went out. */
const sentHeaders = async (
    id: string,
    input: RunInput,
    params: Record<string, string>,
) => {
    const seen: Headers[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve(params),
            fetch: (_target, init) => {
                seen.push(new Headers(init?.headers));
                return Promise.resolve(
                    new Response(JSON.stringify({ data: [] }), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(id));
    const result = await loaded.run(input);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(seen.length, 1);
    return seen[0];
};

Deno.test("fxmacrodata auth: X-API-Key sent when a key resolves", async () => {
    const headers = await sentHeaders(
        "fxmacrodata#v1/forex/{base}/{quote}",
        { pathParams: { base: "EUR", quote: "USD" } },
        { apiKey: "test-key" },
    );
    assertEquals(headers.get("X-API-Key"), "test-key");
});

Deno.test("fxmacrodata auth: no key, request goes out bare", async () => {
    const headers = await sentHeaders(
        "fxmacrodata#v1/announcements/{currency}/latest",
        { pathParams: { currency: "USD" } },
        {},
    );
    assertEquals(headers.has("X-API-Key"), false);
    assertEquals(headers.has("Authorization"), false);
});
