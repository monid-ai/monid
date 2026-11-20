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

const ID = "loyaltie#build-cart-link";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const BODY: Record<string, Json> = {
    cart: {
        line_items: [{
            id: "00036129-287b-43a6-a426-18bd0d9b2f5f",
            quantity: 2,
        }],
    },
};

Deno.test(`${ID} happy (recorded 2026-11-17): sends an attributed tools/call; returns the tool result unchanged; free`, async () => {
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const { result, sent } = await replayCapturing(ID, { body: BODY }, fixture);
    // what the compiled endpoint put on the wire, not the recording
    assertEquals(sent, [expectedEnvelope("build_cart_link", BODY)]);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model: nothing billed, nothing evidenced
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the whole structuredContent survives unwrapping (no JSON-RPC envelope)
    const expected = recordedStructuredContent(fixture) as Record<string, Json>;
    assertEquals(result.output, expected);
    // product ids and quantities survive unwrapping
    const lines = (result.output as Record<string, Json[]>).line_items;
    assertEquals(lines.length, (expected.line_items as Json[]).length);
    assertEquals(lines.length, 1);
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

Deno.test(`${ID} schema gate: quantity 0 is rejected; the quantity 1 twin passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    body: {
                        cart: {
                            line_items: [{
                                id: "00036129-287b-43a6-a426-18bd0d9b2f5f",
                                quantity: 0,
                            }],
                        },
                    },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: {
            body: {
                cart: {
                    line_items: [{
                        id: "00036129-287b-43a6-a426-18bd0d9b2f5f",
                        quantity: 1,
                    }],
                },
            },
        },
        mode: "replay",
        fixture,
    });
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
            input: {
                body: {
                    cart: { line_items: [{ id: productId, quantity: 1 }] },
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
        assert(
            `${output.cart_link}`.startsWith("https://loyaltie.com/cart?"),
            "loyaltie.com cart link",
        );
        assert(`${output.cart_link}`.includes("agent=monid"));
        assert(Array.isArray(output.line_items));
    },
});
