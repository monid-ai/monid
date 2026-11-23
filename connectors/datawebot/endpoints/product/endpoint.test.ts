import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
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

Deno.test("datawebot#product and #search share one lifecycle fn", async () => {
    const product = await testSealedUnit(ID);
    const search = await testSealedUnit("datawebot#search");
    assertEquals(
        JSON.stringify(product.doc.lifecycle),
        JSON.stringify(search.doc.lifecycle),
    );
});
