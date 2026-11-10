import { assert, assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

const BASE = "https://backend.frankki.app/api/v1/public/monid/letter";
const ENDPOINTS = [
    "quote",
    "address-check",
    "compose",
    "preview",
    "checkout",
    "track",
];

Deno.test("frankki provenance: six POSTs on one host, FREE, provider-shared fns", async () => {
    const bundle = await testBundle();
    const docs = ENDPOINTS.map((name) => bundle.endpoints[`frankki#${name}`]);
    for (const [i, doc] of docs.entries()) {
        assertEquals(doc.request.url, `${BASE}/${ENDPOINTS[i]}`);
        assertEquals(doc.request.method, "POST");
        // FREE (D27): no vendor meter, only the synthesized empty fns
        assertEquals(doc.usage.consolidate, undefined);
        assertEquals(
            bundle.fnTable[doc.usage.evidence.$fn.key].provenance,
            "core#usage.synthesizedEmpty",
        );
    }
    // auth and both output hooks are provider-level: one fn entry each
    for (const slot of ["auth", "fromResponse", "fromError"] as const) {
        const keys = new Set(
            docs.map((doc) =>
                slot === "auth"
                    ? doc.auth.inject.$fn.key
                    : doc.output?.[slot]?.$fn.key
            ),
        );
        assertEquals(keys.size, 1, slot);
        assert(!keys.has(undefined), `${slot} fn entry missing`);
    }
});
