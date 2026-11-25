import { assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

Deno.test("spicrawl: fn provenance — one inject, one fromError, one consolidate across the three docs", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("spicrawl#"))
        .sort();
    assertEquals(ids, [
        "spicrawl#brand",
        "spicrawl#jobs/search",
        "spicrawl#scrape",
    ]);
    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            doc.output.fromError?.$fn.key,
            first.output.fromError?.$fn.key,
            id,
        );
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            first.usage.consolidate?.$fn.key,
            id,
        );
    }
});
