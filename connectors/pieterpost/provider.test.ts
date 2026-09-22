import { assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

const ENDPOINTS = [
    "pieterpost#create-compose-link",
    "pieterpost#create-checkout-link",
] as const;

Deno.test("pieterpost docs: shared bearer auth, lifecycle relay, and free usage", async () => {
    const bundle = await testBundle();
    const first = bundle.endpoints[ENDPOINTS[0]];
    for (const id of ENDPOINTS) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            doc.lifecycle?.start.$fn.key,
            first.lifecycle?.start.$fn.key,
            id,
        );
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.usage.model, { kind: "FREE" }, id);
        assertEquals(
            doc.request.url.startsWith("https://pieterpost.com/v1/"),
            true,
            id,
        );
    }
});
