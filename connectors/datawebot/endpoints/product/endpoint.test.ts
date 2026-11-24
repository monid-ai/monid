import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "datawebot#product";

Deno.test("datawebot#product offers: every seller's price, 1 credit", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { product_id: "pid-1" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-product-offers.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals((output.offers as unknown[]).length, 2);
});

Deno.test("datawebot#product estimate: 1 credit", async () => {
    const estimate = await estimateEndpoint(await testSealedUnit(ID), {
        body: { url: "https://www.walmart.com/ip/example-1" },
    });
    assertEquals(estimate.credits, { default: 1 });
});

Deno.test("datawebot#product follows next_cursor and joins every variant", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                url: "https://www.allbirds.com/products/example-runner",
                format: "raw",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-product-variants.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
    const output = result.output as Record<string, any>;
    assertEquals(
        output.product.details.variants.map((v: { sku: string }) => v.sku),
        ["SKU-1", "SKU-2", "SKU-3"],
    );
    assertEquals(output.next_cursor, null);
    assertEquals("variants_offset" in output.product.details, false);
    assertEquals("credits_left" in output.meta, false);
    assertEquals(output.raw[0].credits_left, 3);
});

Deno.test("datawebot#product url that is not a URL fails INVALID_INPUT before the wire", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-product-offers.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { url: "not-a-url" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: "datawebot#product live (gated on DATAWEBOT_API_KEY)",
    ignore: liveSkip("datawebot"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    url: "https://www.allbirds.com/products/mens-tree-runners",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
