/**
 * Provider-wide checks, one per provider: the shared lifecycle.start
 * classification, identity/provenance, auth and bulk-safety bounds. Each
 * endpoint's own happy, request, error, schema-gate and live cases live in
 * `endpoints/<e>/endpoint.test.ts`.
 */
import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import {
    captureRun,
    MCP_URL,
    ONE_CALL,
    providerFixture,
    structuredOf,
    ZERO,
} from "./testing.ts";

const ENDPOINTS = fromFileUrl(new URL("./endpoints/", import.meta.url));
const happyOf = (e: string) =>
    loadFixture(`${ENDPOINTS}${e}/fixtures/happy.json`);

/** The nine public read tools, as their stable Monid identities. */
const IDS = [
    "dimhour#list-cities",
    "dimhour#search-venues",
    "dimhour#get-venue",
    "dimhour#list-new-venues",
    "dimhour#list-curated",
    "dimhour#find-places",
    "dimhour#get-hours",
    "dimhour#search",
    "dimhour#fetch",
];

const GET_HOURS_INPUT = { body: { city: "dallas", name: "Las Palmas" } };

Deno.test("dimhour vendor non-2xx (HTTP 400): provider error, zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("dimhour#search"),
        input: { body: { query: "ramen dallas" } },
        mode: "replay",
        fixture: await providerFixture("http-error"),
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, ZERO);
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "Parse error: body must be JSON-RPC 2.0",
    );
});

Deno.test("dimhour output: structuredContent wins over a differing text block", async () => {
    const chain = await providerFixture("synthetic-structured-preferred");
    const result = await runEndpoint({
        unit: await testSealedUnit("dimhour#get-hours"),
        input: GET_HOURS_INPUT,
        mode: "replay",
        fixture: chain,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, ONE_CALL);
    assertEquals(result.output, structuredOf(chain));
});

Deno.test("dimhour fallback: JSON in content[0].text is parsed when structuredContent is absent", async () => {
    const chain = await providerFixture("synthetic-text-fallback");
    const result = await runEndpoint({
        unit: await testSealedUnit("dimhour#get-hours"),
        input: GET_HOURS_INPUT,
        mode: "replay",
        fixture: chain,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, ONE_CALL);
    const text = (chain.calls[0].res.body as {
        result: { content: { text: string }[] };
    }).result.content[0].text;
    assertEquals(result.output, JSON.parse(text));
    // and it is the same payload the structured twin carries
    assertEquals(result.output, structuredOf(await happyOf("get-hours")));
});

Deno.test("dimhour defensive: non-JSON text never settles as a successful structured result", async () => {
    const chain = await providerFixture("synthetic-text-malformed");
    const result = await runEndpoint({
        unit: await testSealedUnit("dimhour#search-venues"),
        input: { body: { city: "dallas", query: "ramen", limit: 2 } },
        mode: "replay",
        fixture: chain,
    });
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, ZERO);
    const out = result.output as Record<string, unknown>;
    assertEquals(
        out.message,
        "Dim Hour answered without structured JSON content",
    );
    assertEquals(out.raw, chain.calls[0].res.body);
});

Deno.test("dimhour identity: nine endpoints share POST /mcp and compile to unique stable ids", async () => {
    const bundle = await testBundle();
    const docs = Object.values(bundle.endpoints).filter((d) =>
        d.provider === "dimhour"
    );
    assertEquals(docs.map((d) => d.id).sort(), [...IDS].sort());
    for (const doc of docs) {
        assertEquals(doc.request.url, MCP_URL, doc.id);
        assertEquals(doc.request.method, "POST", doc.id);
        assertEquals(doc.id, `dimhour#${doc.endpoint.slice(1)}`);
    }
    // one shared transport path, nine distinct public identities
    assertEquals(new Set(docs.map((d) => d.request.url)).size, 1);
    assertEquals(new Set(docs.map((d) => d.endpoint)).size, IDS.length);
    // the classification is ONE provider fn every endpoint links to
    const starts = new Set(
        docs.map((d) => JSON.stringify(d.lifecycle?.start)),
    );
    assertEquals(starts.size, 1);
});

Deno.test("dimhour auth: reads go out with no key; a configured key travels as x-api-key", async () => {
    const unit = await testSealedUnit("dimhour#list-cities");
    const chain = await happyOf("list-cities");
    const bare = await captureRun(unit, {}, chain);
    assertEquals(bare.result.isProviderError, false);
    assertEquals(bare.sent[0].headers.get("x-api-key"), null);
    assertEquals(bare.sent[0].headers.get("authorization"), null);
    const keyed = await captureRun(unit, {}, chain, { apiKey: "test-key" });
    assertEquals(keyed.sent[0].headers.get("x-api-key"), "test-key");
});

Deno.test("dimhour bulk safety: every limit is bounded by the source", async () => {
    const bundle = await testBundle();
    const bounds: Record<string, number> = {};
    for (const doc of Object.values(bundle.endpoints)) {
        if (doc.provider !== "dimhour") continue;
        const props = (doc.input.schema?.body?.properties ?? {}) as Record<
            string,
            { maximum?: number }
        >;
        if (props.limit) bounds[doc.id] = props.limit.maximum ?? Infinity;
    }
    assertEquals(bounds, {
        "dimhour#search-venues": 25,
        "dimhour#find-places": 25,
        "dimhour#list-new-venues": 100,
    });
    // the other half, no test input asking for more than MAX_TEST_LIMIT,
    // is enforced where each input is written: assertSmall() in every
    // endpoint.test.ts
});
