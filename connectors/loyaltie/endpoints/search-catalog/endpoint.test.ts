import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import {
    expectedEnvelope,
    recordedStructuredContent,
    replayCapturing,
} from "../../test-wire.ts";

const ID = "loyaltie#search-catalog";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const CATALOG: Record<string, Json> = {
    query: "pasta",
    context: { intent: "healthy pasta every month" },
    filters: { regular_delivery: true },
    pagination: { limit: 2 },
};

Deno.test(`${ID} happy (recorded 2026-11-17): sends an attributed tools/call; returns the tool result unchanged; free`, async () => {
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const { result, sent } = await replayCapturing(
        ID,
        { body: { catalog: CATALOG } },
        fixture,
    );
    // what the compiled endpoint put on the wire, not the recording
    assertEquals(sent, [
        expectedEnvelope("search_catalog", { catalog: CATALOG }),
    ]);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model: nothing billed, nothing evidenced
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the whole structuredContent survives unwrapping (no JSON-RPC envelope)
    const expected = recordedStructuredContent(fixture) as Record<
        string,
        Json
    >;
    assertEquals(result.output, expected);
    const products = (result.output as Record<string, Json[]>).products;
    assertEquals(products.length, (expected.products as Json[]).length);
    assertEquals(products.length, 2);
});

Deno.test(`${ID} provider error (synthetic 400): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { catalog: CATALOG } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
    });
});

Deno.test(`${ID} schema gate: limit 0 rejected; the limit 1 twin passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const withLimit = (limit: number) => ({
        body: { catalog: { ...CATALOG, pagination: { limit } } },
    });
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: withLimit(0),
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: withLimit(1),
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        `${ID} live (gated: the server is keyless; set LOYALTIE_API_KEY to any value to run)`,
    ignore: liveSkip("loyaltie"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    catalog: { query: "coffee", pagination: { limit: 2 } },
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assert("ucp" in output, "UCP envelope present");
        const products = output.products as Array<Record<string, unknown>>;
        assert(Array.isArray(products));
        for (const product of products) {
            assertEquals(typeof product.id, "string");
            assert(`${product.url}`.includes("agent=monid"));
        }
    },
});
