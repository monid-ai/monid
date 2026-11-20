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

const ID = "loyaltie#get-product";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const BODY: Record<string, Json> = {
    catalog: { id: "00036129-287b-43a6-a426-18bd0d9b2f5f" },
};

Deno.test(`${ID} happy (recorded 2026-11-17): sends an attributed tools/call; returns the tool result unchanged; free`, async () => {
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const { result, sent } = await replayCapturing(ID, { body: BODY }, fixture);
    // what the compiled endpoint put on the wire, not the recording
    assertEquals(sent, [expectedEnvelope("get_product", BODY)]);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model: nothing billed, nothing evidenced
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the whole structuredContent survives unwrapping (no JSON-RPC envelope)
    const expected = recordedStructuredContent(fixture) as Record<string, Json>;
    assertEquals(result.output, expected);
    assertEquals(
        (result.output as Record<string, Record<string, Json>>).product.id,
        "00036129-287b-43a6-a426-18bd0d9b2f5f",
    );
});

Deno.test(`${ID} provider error (synthetic 400): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: BODY },
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

Deno.test(`${ID} schema gate: an empty catalog.id is rejected; the same id non-empty passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { catalog: { id: "" } } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { body: BODY },
        mode: "replay",
        fixture,
    });
});

Deno.test(`${ID} not found (recorded 2026-11-17): the UCP not_found message comes back, free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}not-found.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { catalog: { id: "00000000-0000-0000-0000-000000000000" } },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, recordedStructuredContent(fixture));
    const messages = (result.output as Record<string, Json>)
        .messages as Array<Record<string, Json>>;
    assertEquals(messages[0].code, "not_found");
    // The server answers a tool-level error with HTTP 200 (`isError: true`),
    // and the engine classifies by HTTP status, so this run is not flagged
    // as a provider error. Flagging it needs an engine-level hook; see the
    // PR discussion.
    assertEquals(result.isProviderError, false);
});

Deno.test({
    name:
        `${ID} live (gated: the server is keyless; set LOYALTIE_API_KEY to any value to run)`,
    ignore: liveSkip("loyaltie"),
    fn: async () => {
        // a live product id, so the test does not depend on one listing
        const search = await runEndpoint({
            unit: await testSealedUnit("loyaltie#search-catalog"),
            input: {
                body: {
                    catalog: { query: "coffee", pagination: { limit: 1 } },
                },
            },
            mode: "live",
        });
        const found = (search.output as Record<string, unknown>)
            .products as Array<Record<string, unknown>>;
        assert(found.length > 0, "live search returned a product");
        const productId = `${found[0].id}`;
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { catalog: { id: productId } } },
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
        const product = output.product as Record<string, unknown>;
        assertEquals(product.id, productId);
        assertEquals(typeof product.title, "string");
    },
});
